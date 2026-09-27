/**
 * Claude-written species content via the Message Batches API (half the price of normal calls).
 * Two jobs:
 *   - trees: classify every plant as tree or not, 100 names per request
 *   - enrich: fun fact, size, colours and habitat per species, grounded in its Wikipedia text
 * Batches can take up to 24 h. Submitted batch ids are saved to data/pending-batches.json so a later run can collect them.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ColourKey, HabitatKey } from '../../src/data/types';
import { COLOUR_KEYS, HABITAT_KEYS, type Enrichment, type Gathered } from './pure';

export const DEFAULT_MODEL = 'claude-opus-5';

/** Batch prices in USD per million tokens (50% of standard). Used for the cost line in the report. */
const BATCH_PRICE: Record<string, [input: number, output: number]> = {
  'claude-opus-5': [2.5, 12.5],
  'claude-sonnet-5': [1, 5],
  'claude-haiku-4-5': [0.5, 2.5],
};

export interface Pending {
  id: string;
  kind: 'trees' | 'enrich';
  model: string;
  submitted: string;
  /** custom_id → scientific names covered by that request */
  map: Record<string, string[]>;
}

export interface Usage {
  input: number;
  output: number;
  usd: number;
}

const ENRICH_SYSTEM = `You write short, accurate trading-card content for a personal field-guide app about the wildlife and plants of Quintana Roo, Mexico.
You receive one species with its Wikipedia summary in English and/or Spanish.

Rules:
- fact_en: one surprising, true fun fact in plain English, at most 25 words. Base it on the Wikipedia text. If the text has nothing surprising, state its most interesting true detail. Never invent numbers.
- fact_es: the same fact in natural Mexican Spanish.
- about_en / about_es: leave as an empty string when Wikipedia text in that language was provided. Otherwise write 2-3 sentences in that language, based only on the text you have.
- size: the typical adult size with a unit, like "34 cm", "1.2 m" or "25 m" (height for trees and plants, length for animals, wingspan only for butterflies). Use the Wikipedia text or well-established reference values. Use an empty string if you are not sure.
- colours: the 1-3 most visible colours of the organism as seen in the field.
- habitats: where in Quintana Roo it is found, from the allowed list only. Use an empty list if unclear.
- role_en / role_es: one or two sentences on its role in nature: what it does for its ecosystem or for people (e.g. builds reefs, pollinates, spreads seeds, controls insects, filters water). Use an empty string if you are not sure.
- sex_en / sex_es: for animals, one or two sentences on how to tell a male from a female in the field (size, colour, shape, behaviour). If they look alike, say so. Use an empty string for plants, and when you are not sure.`;

const ENRICH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fact_en', 'fact_es', 'about_en', 'about_es', 'size', 'colours', 'habitats', 'role_en', 'role_es', 'sex_en', 'sex_es'],
  properties: {
    fact_en: { type: 'string' },
    fact_es: { type: 'string' },
    about_en: { type: 'string' },
    about_es: { type: 'string' },
    size: { type: 'string' },
    colours: { type: 'array', items: { type: 'string', enum: COLOUR_KEYS } },
    habitats: { type: 'array', items: { type: 'string', enum: HABITAT_KEYS } },
    role_en: { type: 'string' },
    role_es: { type: 'string' },
    sex_en: { type: 'string' },
    sex_es: { type: 'string' },
  },
};

const TREES_SYSTEM = `You classify plants observed in Quintana Roo, Mexico, by growth form.
A plant counts as a tree when it usually grows as a woody plant with a trunk, taller than about 4 m. Palms and mangrove trees count as trees.
Shrubs, vines, herbs, grasses, epiphytes, cacti, ferns and aquatic plants are not trees.
Return every scientific name you were given, exactly as written.`;

const TREES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['sci', 'tree'], properties: { sci: { type: 'string' }, tree: { type: 'boolean' } } },
    },
  },
};

type BatchRequest = Anthropic.Messages.BatchCreateParams.Request;

function enrichRequest(g: Gathered, model: string): BatchRequest {
  const parts = [
    `Scientific name: ${g.sci}`,
    `Category: ${g.cat}`,
    g.nameEn ? `English name: ${g.nameEn}` : '',
    g.nameEs ? `Spanish name: ${g.nameEs}` : '',
    g.introduced ? 'Introduced (not native) in Quintana Roo.' : '',
    `Allowed habitats: ${HABITAT_KEYS.join(', ')}`,
    g.wikiEn ? `<wikipedia lang="en" title="${g.wikiEn.title}">\n${g.wikiEn.extract}\n</wikipedia>` : 'No English Wikipedia text.',
    g.wikiEs ? `<wikipedia lang="es" title="${g.wikiEs.title}">\n${g.wikiEs.extract}\n</wikipedia>` : 'No Spanish Wikipedia text.',
  ].filter(Boolean);
  return {
    custom_id: `e${g.taxonId}`,
    params: {
      model,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ENRICH_SCHEMA } },
      system: [{ type: 'text', text: ENRICH_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: parts.join('\n') }],
    },
  };
}

function treesRequest(id: string, plants: Gathered[], model: string): BatchRequest {
  const list = plants.map((p) => `${p.sci}${p.nameEn ? ` (${p.nameEn})` : ''}`).join('\n');
  return {
    custom_id: id,
    params: {
      model,
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: TREES_SCHEMA } },
      system: TREES_SYSTEM,
      messages: [{ role: 'user', content: list }],
    },
  };
}

export class ClaudeContent {
  client = new Anthropic();
  usage: Usage = { input: 0, output: 0, usd: 0 };
  failures: string[] = [];
  constructor(
    public model: string,
    private log: (m: string) => void = console.log,
  ) {}

  /** Rough pre-flight cost estimate from character counts (about 4 characters per token). */
  estimate(enrich: Gathered[], plants: Gathered[]): number {
    const [pi, po] = BATCH_PRICE[this.model] ?? BATCH_PRICE[DEFAULT_MODEL];
    const inTok = enrich.reduce((s, g) => s + 450 + ((g.wikiEn?.extract.length ?? 0) + (g.wikiEs?.extract.length ?? 0)) / 4, 0) + plants.length * 15;
    const outTok = enrich.length * 900 + plants.length * 20;
    return (inTok * pi + outTok * po) / 1e6;
  }

  submitTrees(plants: Gathered[]): Promise<Pending | null> {
    const map: Record<string, string[]> = {};
    const reqs: BatchRequest[] = [];
    for (let i = 0; i < plants.length; i += 100) {
      const chunk = plants.slice(i, i + 100);
      const id = `g${i / 100}`;
      map[id] = chunk.map((p) => p.sci);
      reqs.push(treesRequest(id, chunk, this.model));
    }
    return this.submit('trees', reqs, map);
  }

  submitEnrich(list: Gathered[]): Promise<Pending | null> {
    const map = Object.fromEntries(list.map((g) => [`e${g.taxonId}`, [g.sci]]));
    return this.submit('enrich', list.map((g) => enrichRequest(g, this.model)), map);
  }

  private async submit(kind: Pending['kind'], requests: BatchRequest[], map: Record<string, string[]>): Promise<Pending | null> {
    if (!requests.length) return null;
    const batch = await this.client.messages.batches.create({ requests });
    this.log(`Submitted ${kind} batch ${batch.id} with ${requests.length} requests`);
    return { id: batch.id, kind, model: this.model, submitted: new Date().toISOString(), map };
  }

  /** Waits until the batch ends or the deadline passes. Returns false if still running. */
  async wait(p: Pending, deadline: number): Promise<boolean> {
    for (;;) {
      const b = await this.client.messages.batches.retrieve(p.id);
      if (b.processing_status === 'ended') return true;
      if (Date.now() > deadline) {
        this.log(`Batch ${p.id} still ${b.processing_status} (${b.request_counts.processing} processing). Will collect on the next run.`);
        return false;
      }
      this.log(`Batch ${p.id}: ${b.request_counts.succeeded} done, ${b.request_counts.processing} processing`);
      await new Promise((r) => setTimeout(r, 60_000));
    }
  }

  /** Reads an ended batch into trees/enrichment. Failed requests are simply retried next run. */
  async collect(p: Pending, trees: Record<string, boolean>, enrichment: Record<string, Enrichment>): Promise<void> {
    const [pi, po] = BATCH_PRICE[p.model] ?? BATCH_PRICE[DEFAULT_MODEL];
    const date = new Date().toISOString().slice(0, 10);
    for await (const r of await this.client.messages.batches.results(p.id)) {
      const names = p.map[r.custom_id] || [];
      if (r.result.type !== 'succeeded') {
        this.failures.push(`${r.custom_id} (${names[0] ?? '?'}): ${r.result.type}`);
        continue;
      }
      const msg = r.result.message;
      const u = msg.usage;
      const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      this.usage.input += input;
      this.usage.output += u.output_tokens;
      this.usage.usd += (input * pi + u.output_tokens * po) / 1e6;
      if (msg.stop_reason !== 'end_turn') {
        this.failures.push(`${r.custom_id} (${names[0] ?? '?'}): stop_reason ${msg.stop_reason}`);
        continue;
      }
      const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        this.failures.push(`${r.custom_id}: invalid JSON`);
        continue;
      }
      if (p.kind === 'trees') {
        const allowed = new Set(names);
        for (const it of (json as { items: { sci: string; tree: boolean }[] }).items) if (allowed.has(it.sci)) trees[it.sci] = it.tree;
      } else {
        const j = json as { fact_en: string; fact_es: string; about_en: string; about_es: string; size: string; colours: ColourKey[]; habitats: HabitatKey[]; role_en?: string; role_es?: string; sex_en?: string; sex_es?: string };
        enrichment[names[0]] = {
          fact: [j.fact_en.trim(), j.fact_es.trim()],
          about: [j.about_en.trim(), j.about_es.trim()],
          size: j.size.trim(),
          col: [...new Set(j.colours)].slice(0, 3),
          hab: [...new Set(j.habitats)],
          ...(j.role_en?.trim() ? { role: [j.role_en.trim(), (j.role_es || '').trim()] as [string, string] } : {}),
          ...(j.sex_en?.trim() ? { sex: [j.sex_en.trim(), (j.sex_es || '').trim()] as [string, string] } : {}),
          model: p.model,
          date,
        };
      }
    }
  }
}

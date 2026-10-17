import type { GuideKey, Lang } from './data/types';

/**
 * First aid per kind of injury, written in-session from current first-aid guidance
 * (WHO snakebite guidelines, Red Cross, poison-control advice). Bundled with the app so it works offline.
 * Each guide: what to do (in order), what not to do, and when to call 911 at once.
 */
export interface Guide {
  title: string;
  steps: string[];
  dont?: string[];
  call911?: string;
}

const ALLERGY_EN = 'the face, lips or throat swell, hives spread over the body, breathing gets hard, or the person feels faint. This can kill within minutes. Use their adrenaline pen if they carry one.';
const ALLERGY_ES = 'se hinchan la cara, los labios o la garganta, salen ronchas por todo el cuerpo, cuesta respirar o la persona se marea. Esto puede matar en minutos. Usa su pluma de adrenalina si la trae.';
const HOT_EN = 'Soak the wound in hot water, as hot as you can stand without burning (about 40–45 °C; test it with your other hand), for 30–90 minutes. Heat breaks down the venom and is the best pain relief.';
const HOT_ES = 'Mete la herida en agua caliente, tan caliente como aguantes sin quemarte (unos 40–45 °C; pruébala con la otra mano), de 30 a 90 minutos. El calor descompone el veneno y es el mejor alivio.';
const EYES_EN = 'In the eyes: rinse with clean running water for 15 minutes and see a doctor today.';
const EYES_ES = 'En los ojos: enjuaga con agua limpia corriendo durante 15 minutos y ve al médico hoy.';

const en: Record<GuideKey, Guide> = {
  snake: {
    title: 'Snakebite',
    steps: [
      "Move away from the snake. Don't try to catch or kill it; a photo from a safe distance helps the doctors.",
      'Call 911 or go straight to the nearest hospital. Antivenom is the only treatment that works.',
      'Keep still and calm. Keep the bitten arm or leg still, at about heart level. Carry the person if you can.',
      'Take off rings, watches, bracelets and tight shoes before the swelling starts.',
      'Note the time of the bite and how the symptoms change.',
    ],
    dont: [
      'No tourniquet or tight band.',
      "Don't cut or suck the wound.",
      'No ice, alcohol, electric shocks or home remedies.',
      'No aspirin or ibuprofen: they make bleeding worse.',
      "Don't wait to see if symptoms appear.",
    ],
  },
  scorpion: {
    title: 'Scorpion sting',
    steps: [
      'Wash the sting with soap and water.',
      'Hold a cold pack wrapped in cloth on it, 10 minutes at a time, for the pain.',
      'Stay calm and still, and watch for symptoms over the next hours.',
      'Children, older people and anyone with symptoms beyond the sting: go to a health centre or hospital now. They carry scorpion antivenom.',
      'Prevention: shake out shoes, clothes, towels and bedding before using them.',
    ],
    dont: ["Don't cut the sting or use a tourniquet.", 'No alcohol.'],
    call911: 'numbness spreads beyond the sting, the tongue or throat tingles, the person drools or struggles to swallow or breathe, or has jerky eye movements, twitching or restlessness.',
  },
  bite: {
    title: 'Venomous bite',
    steps: [
      'Wash the bite with soap and water.',
      'Hold a cold pack wrapped in cloth on it, 10 minutes at a time.',
      'Keep the bitten arm or leg still and raised.',
      'See a doctor if there are muscle cramps and sweating, if the wound turns dark or keeps growing over the next days, if redness spreads or a fever starts, or if a small child was bitten.',
    ],
    call911: 'breathing gets hard, there is chest pain, or ' + ALLERGY_EN,
  },
  sting: {
    title: 'Bee or wasp sting',
    steps: [
      'Walk away quickly: more may follow.',
      'If a bee left its stinger in the skin, scrape it out within seconds with a fingernail or card. Speed matters more than how.',
      'Wash with soap and water and hold a cold pack on it. An antihistamine helps against the itch.',
      "Attacked by a swarm: run in a straight line to a car or building and cover your face. Don't jump into water; they wait for you. Dozens of stings need a hospital, even without an allergy.",
    ],
    call911: ALLERGY_EN,
  },
  ants: {
    title: 'Ant stings',
    steps: [
      'Step away and brush the ants off quickly: fire ants hold on and sting again and again.',
      'Wash with soap and water and hold a cold pack on it.',
      "Don't pop the white blisters fire ants leave: they get infected easily.",
      'Hydrocortisone cream or an antihistamine helps against the itch.',
    ],
    call911: ALLERGY_EN,
  },
  jelly: {
    title: 'Jellyfish, fire coral or anemone sting',
    steps: [
      'Get out of the water calmly.',
      'Rinse with sea water, never fresh water: fresh water makes the remaining stinging cells fire.',
      'Box jellyfish (sea wasp) only: pour vinegar over the sting for at least 30 seconds first.',
      "Lift off any tentacles with tweezers, a glove or the edge of a card. Don't rub.",
      'Then soak the area in hot water (about 45 °C, as hot as comfortable) for 20–40 minutes. Use a cold pack if there is no hot water.',
    ],
    dont: ['No fresh water, urine or alcohol.', "Don't rub with sand or a towel."],
    call911: 'breathing gets hard, there is chest pain, strong back or belly cramps, confusion, or the sting covers a large area. Be extra quick with children and with box jellyfish or Portuguese man o’ war stings.',
  },
  spines: {
    title: 'Stingray, lionfish or catfish spine',
    steps: [
      'Get out of the water.',
      HOT_EN,
      'Gently remove spine pieces you can see, then rinse the wound well.',
      'See a doctor: these wounds often hide spine fragments and get infected. Ask about a tetanus shot.',
    ],
    dont: ["Don't pull out a spine stuck in the chest, belly or neck: leave it and call 911.", "Don't close the wound tightly."],
    call911: 'a spine went into the chest, belly or neck, there is heavy bleeding, fainting or trouble breathing.',
  },
  urchin: {
    title: 'Sea urchin spines',
    steps: [
      HOT_EN,
      "Pull out spines that stick out with tweezers. Don't dig for broken bits: many dissolve, and dark dots are often just dye.",
      'Wash with soap and water and keep the wound clean.',
      'See a doctor if a spine is near a joint, the redness or swelling gets worse, a fever starts, or it still hurts after a few days.',
    ],
  },
  hairs: {
    title: 'Stinging caterpillar or hairs',
    steps: [
      "Don't rub. Press sticky tape on the skin and pull it off; repeat with fresh tape until the hairs are gone.",
      'Wash with soap and water and hold a cold pack on it.',
      'Hydrocortisone cream or an antihistamine helps against the rash.',
      EYES_EN,
      'See a doctor if the pain is severe or spreading, or for a child. After a Lonomia caterpillar: hospital at once, even without pain.',
    ],
    call911: 'there is bleeding from the gums or nose, blood in the urine or unexplained bruises (Lonomia), or ' + ALLERGY_EN,
  },
  plant: {
    title: 'Poisonous sap or stinging plant',
    steps: [
      'Wash the skin with soap and plenty of water as soon as you can, ideally within 10 minutes.',
      'Also wash the clothes, shoes, tools and pets that touched it: the sap stays active.',
      'Stinging hairs: use sticky tape to pull them off, then a cold pack.',
      "Cool compresses, calamine or hydrocortisone cream and an antihistamine ease the rash. Don't scratch or pop blisters.",
      EYES_EN,
      'See a doctor if the rash is on the face, eyes or genitals, covers a large area, or blisters fill with pus.',
    ],
    dont: ["Don't burn these plants: the smoke harms eyes and lungs.", "Don't shelter under a manchineel when it rains."],
  },
  skin: {
    title: 'Poison on the skin',
    steps: [
      "Don't crush the animal on your skin: blow or flick it off.",
      'Wash the skin with soap and water right away.',
      "Wash your hands before touching your eyes or mouth.",
      "Cool compresses help; leave blisters intact.",
      EYES_EN,
    ],
  },
  toad: {
    title: 'Toad poison',
    steps: [
      'People: wash the skin with soap and water and keep your hands away from your eyes and mouth.',
      EYES_EN,
      'Dog or cat bit or licked a toad: rinse its mouth with running water for 10 minutes, head pointing down so the water runs out, not down its throat. Wipe the gums with a wet cloth.',
      'Then go to a vet right away, even if it seems fine. Warning signs: heavy drooling, bright red gums, shaking, stumbling, seizures.',
    ],
  },
  chagas: {
    title: 'Kissing bug (Chagas)',
    steps: [
      "Don't crush the bug on your skin: the infection comes from its droppings, not the bite.",
      "Wash the bite with soap and water. Don't scratch it or rub your eyes.",
      'Catch the bug in a jar or bag without touching it, and take it to a health centre (Secretaría de Salud). They test bugs and people for Chagas.',
      'Ask for a Chagas blood test, especially if one eyelid swells or you get a fever in the following weeks. Treatment works best early.',
    ],
  },
};

const es: Record<GuideKey, Guide> = {
  snake: {
    title: 'Mordida de serpiente',
    steps: [
      'Aléjate de la serpiente. No intentes atraparla ni matarla; una foto desde lejos ayuda a los médicos.',
      'Llama al 911 o ve directo al hospital más cercano. El antiveneno es el único tratamiento que funciona.',
      'Quédate quieto y tranquilo. Mantén inmóvil el brazo o la pierna mordida, más o menos a la altura del corazón. Carga a la persona si puedes.',
      'Quita anillos, relojes, pulseras y zapatos apretados antes de que empiece la hinchazón.',
      'Anota la hora de la mordida y cómo cambian los síntomas.',
    ],
    dont: [
      'Nada de torniquetes ni vendas apretadas.',
      'No cortes ni chupes la herida.',
      'Nada de hielo, alcohol, descargas eléctricas ni remedios caseros.',
      'Nada de aspirina ni ibuprofeno: empeoran el sangrado.',
      'No esperes a ver si aparecen síntomas.',
    ],
  },
  scorpion: {
    title: 'Picadura de alacrán',
    steps: [
      'Lava la picadura con agua y jabón.',
      'Pon una compresa fría envuelta en tela, 10 minutos cada vez, para el dolor.',
      'Mantén la calma, no te muevas mucho y vigila los síntomas en las siguientes horas.',
      'Niños, personas mayores y cualquiera con síntomas más allá de la picadura: al centro de salud u hospital ya. Tienen antiveneno.',
      'Prevención: sacude zapatos, ropa, toallas y cobijas antes de usarlos.',
    ],
    dont: ['No cortes la picadura ni pongas torniquete.', 'Nada de alcohol.'],
    call911: 'el adormecimiento se extiende, hormiguean la lengua o la garganta, la persona babea o le cuesta tragar o respirar, o tiene movimientos raros de los ojos, temblores o inquietud.',
  },
  bite: {
    title: 'Mordida venenosa',
    steps: [
      'Lava la mordida con agua y jabón.',
      'Pon una compresa fría envuelta en tela, 10 minutos cada vez.',
      'Mantén el brazo o la pierna quieto y en alto.',
      'Ve al médico si hay calambres y sudor, si la herida se oscurece o crece en los días siguientes, si el enrojecimiento se extiende o da fiebre, o si mordió a un niño pequeño.',
    ],
    call911: 'cuesta respirar, hay dolor de pecho, o ' + ALLERGY_ES,
  },
  sting: {
    title: 'Picadura de abeja o avispa',
    steps: [
      'Aléjate rápido: pueden venir más.',
      'Si una abeja dejó el aguijón, sácalo raspando en segundos con la uña o una tarjeta. Importa más la rapidez que el método.',
      'Lava con agua y jabón y pon una compresa fría. Un antihistamínico ayuda con la comezón.',
      'Si te ataca un enjambre: corre en línea recta a un coche o edificio y cúbrete la cara. No te metas al agua; te esperan. Decenas de picaduras necesitan hospital, aun sin alergia.',
    ],
    call911: ALLERGY_ES,
  },
  ants: {
    title: 'Picaduras de hormiga',
    steps: [
      'Apártate y sacúdete las hormigas rápido: las hormigas de fuego se aferran y pican una y otra vez.',
      'Lava con agua y jabón y pon una compresa fría.',
      'No revientes las ampollas blancas de las hormigas de fuego: se infectan fácilmente.',
      'Una crema de hidrocortisona o un antihistamínico ayudan con la comezón.',
    ],
    call911: ALLERGY_ES,
  },
  jelly: {
    title: 'Picadura de medusa, coral de fuego o anémona',
    steps: [
      'Sal del agua con calma.',
      'Enjuaga con agua de mar, nunca con agua dulce: el agua dulce hace que disparen las células urticantes que quedan.',
      'Solo para cubomedusas (avispa de mar): primero echa vinagre sobre la picadura al menos 30 segundos.',
      'Quita los tentáculos con pinzas, un guante o el borde de una tarjeta. No frotes.',
      'Luego mete la zona en agua caliente (unos 45 °C, tan caliente como sea cómodo) de 20 a 40 minutos. Si no hay agua caliente, usa una compresa fría.',
    ],
    dont: ['Nada de agua dulce, orina ni alcohol.', 'No frotes con arena ni toalla.'],
    call911: 'cuesta respirar, hay dolor de pecho, calambres fuertes de espalda o abdomen, confusión, o la picadura cubre una zona grande. Actúa más rápido con niños y con picaduras de cubomedusa o fragata portuguesa.',
  },
  spines: {
    title: 'Espina de raya, pez león o bagre',
    steps: ['Sal del agua.', HOT_ES, 'Quita con cuidado los pedazos de espina que veas y enjuaga bien la herida.', 'Ve al médico: estas heridas suelen esconder fragmentos de espina y se infectan. Pregunta por la vacuna del tétanos.'],
    dont: ['No saques una espina clavada en el pecho, abdomen o cuello: déjala y llama al 911.', 'No cierres la herida apretando.'],
    call911: 'una espina entró en el pecho, el abdomen o el cuello, hay sangrado fuerte, desmayo o cuesta respirar.',
  },
  urchin: {
    title: 'Espinas de erizo de mar',
    steps: [
      HOT_ES,
      'Saca con pinzas las espinas que sobresalen. No escarbes por los pedazos rotos: muchos se disuelven y los puntos oscuros suelen ser solo tinte.',
      'Lava con agua y jabón y mantén la herida limpia.',
      'Ve al médico si una espina está cerca de una articulación, el enrojecimiento o la hinchazón empeoran, da fiebre, o sigue doliendo después de unos días.',
    ],
  },
  hairs: {
    title: 'Oruga urticante o pelos',
    steps: [
      'No frotes. Pega cinta adhesiva sobre la piel y despégala; repite con cinta nueva hasta quitar los pelos.',
      'Lava con agua y jabón y pon una compresa fría.',
      'Una crema de hidrocortisona o un antihistamínico ayudan con el salpullido.',
      EYES_ES,
      'Ve al médico si el dolor es fuerte o se extiende, o si es un niño. Después de una oruga Lonomia: al hospital ya, aunque no duela.',
    ],
    call911: 'sangran las encías o la nariz, hay sangre en la orina o moretones sin causa (Lonomia), o ' + ALLERGY_ES,
  },
  plant: {
    title: 'Savia venenosa o planta urticante',
    steps: [
      'Lava la piel con jabón y mucha agua lo antes posible, idealmente en menos de 10 minutos.',
      'Lava también la ropa, zapatos, herramientas y mascotas que la tocaron: la savia sigue activa.',
      'Pelos urticantes: quítalos con cinta adhesiva y luego pon una compresa fría.',
      'Compresas frías, loción de calamina o crema de hidrocortisona y un antihistamínico alivian el salpullido. No te rasques ni revientes las ampollas.',
      EYES_ES,
      'Ve al médico si el salpullido está en la cara, los ojos o los genitales, cubre una zona grande, o las ampollas tienen pus.',
    ],
    dont: ['No quemes estas plantas: el humo daña ojos y pulmones.', 'No te refugies bajo un manzanillo cuando llueve.'],
  },
  skin: {
    title: 'Veneno en la piel',
    steps: ['No aplastes al animal sobre la piel: sóplalo o sacúdelo.', 'Lava la piel con agua y jabón de inmediato.', 'Lávate las manos antes de tocarte los ojos o la boca.', 'Las compresas frías ayudan; no revientes las ampollas.', EYES_ES],
  },
  toad: {
    title: 'Veneno de sapo',
    steps: [
      'Personas: lava la piel con agua y jabón y no te toques los ojos ni la boca.',
      EYES_ES,
      'Si un perro o gato mordió o lamió un sapo: enjuágale la boca con agua corriendo 10 minutos, con la cabeza hacia abajo para que el agua salga y no se la trague. Límpiale las encías con un trapo mojado.',
      'Luego ve al veterinario de inmediato, aunque parezca estar bien. Señales de alarma: mucha baba, encías muy rojas, temblores, tambaleo, convulsiones.',
    ],
  },
  chagas: {
    title: 'Chinche besucona (Chagas)',
    steps: [
      'No aplastes la chinche sobre la piel: la infección viene de sus heces, no de la picadura.',
      'Lava la picadura con agua y jabón. No te rasques ni te frotes los ojos.',
      'Atrapa la chinche en un frasco o bolsa sin tocarla y llévala al centro de salud (Secretaría de Salud). Analizan chinches y personas para detectar Chagas.',
      'Pide un análisis de sangre para Chagas, sobre todo si se te hincha un párpado o te da fiebre en las semanas siguientes. El tratamiento funciona mejor al principio.',
    ],
  },
};

export const GUIDES: Record<Lang, Record<GuideKey, Guide>> = { en, es };

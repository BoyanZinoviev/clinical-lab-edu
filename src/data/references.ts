import type { Reference } from '../types';

/**
 * Централен списък с източници. Всеки урок сочи към тях по идентификатор.
 * Включени са само публикации, чието съществуване е проверено; те се цитират за общите принципи, а не като
 * доказателство за конкретни производителски параметри (тях определя листовката на реактива/апарата).
 */
export const references: Reference[] = [
  /* ───────── Учебници ───────── */
  {
    id: 'tietz6',
    kind: 'textbook',
    citation:
      'Rifai N, Horvath AR, Wittwer CT, eds. Tietz Textbook of Clinical Chemistry and Molecular Diagnostics. 6th ed. St. Louis, MO: Elsevier; 2018.',
  },
  {
    id: 'tietz-fund',
    kind: 'textbook',
    citation:
      'Burtis CA, Bruns DE, eds. Tietz Fundamentals of Clinical Chemistry and Molecular Diagnostics. 7th ed. St. Louis, MO: Elsevier; 2015.',
  },
  {
    id: 'skoog',
    kind: 'textbook',
    citation: 'Skoog DA, Holler FJ, Crouch SR. Principles of Instrumental Analysis. 7th ed. Boston, MA: Cengage Learning.',
    note: 'Закон на Beer-Lambert, фотометрия, потенциометрия и основи на хроматографията.',
  },
  {
    id: 'snyder',
    kind: 'textbook',
    citation: 'Snyder LR, Kirkland JJ, Dolan JW. Introduction to Modern Liquid Chromatography. 3rd ed. Hoboken, NJ: John Wiley & Sons; 2010.',
  },
  {
    id: 'westgard-basic',
    kind: 'textbook',
    citation: 'Westgard JO. Basic QC Practices. 4th ed. Madison, WI: Westgard QC; 2016.',
  },

  /* ───────── HbA1c ───────── */
  {
    id: 'sacks2023',
    kind: 'guideline',
    citation:
      'Sacks DB, Arnold M, Bakris GL, et al. Guidelines and recommendations for laboratory analysis in the diagnosis and management of diabetes mellitus. Diabetes Care. 2023;46(10):e151–e199.',
    note: 'Лабораторни аспекти на HbA1c: методи, стандартизация, интерференции.',
  },
  {
    id: 'hoelzel2004',
    kind: 'article',
    citation:
      'Hoelzel W, Weykamp C, Jeppsson JO, et al. IFCC reference system for measurement of hemoglobin A1c in human blood and the national standardization schemes in the United States, Japan, and Sweden: a method-comparison study. Clin Chem. 2004;50(1):166–174.',
  },
  {
    id: 'jeppsson2002',
    kind: 'article',
    citation:
      'Jeppsson JO, Kobold U, Barr J, et al. Approved IFCC reference method for the measurement of HbA1c in human blood. Clin Chem Lab Med. 2002;40(1):78–89.',
  },
  {
    id: 'little2011',
    kind: 'article',
    citation:
      'Little RR, Rohlfing CL, Sacks DB. Status of hemoglobin A1c measurement and goals for improvement: from chaos to order for improving diabetes care. Clin Chem. 2011;57(2):205–214.',
  },
  {
    id: 'ngsp-ifcc',
    kind: 'guideline',
    citation: 'National Glycohemoglobin Standardization Program (NGSP). IFCC Standardization of HbA1c. Електронен ресурс: ngsp.org.',
    note: 'Основно уравнение (master equation) между NGSP (%) и IFCC (mmol/mol).',
  },

  /* ───────── ISE ───────── */
  {
    id: 'bakker1997',
    kind: 'article',
    citation: 'Bakker E, Bühlmann P, Pretsch E. Carrier-based ion-selective electrodes and bulk optodes. 1. General characteristics. Chem Rev. 1997;97(8):3083–3132.',
  },
  {
    id: 'buck1994',
    kind: 'guideline',
    citation: 'Buck RP, Lindner E. Recommendations for nomenclature of ion-selective electrodes (IUPAC Recommendations 1994). Pure Appl Chem. 1994;66(12):2527–2536.',
  },
  {
    id: 'burnett2000a',
    kind: 'guideline',
    citation:
      'Burnett RW, Covington AK, Fogh-Andersen N, et al. Use of ion-selective electrodes for blood-electrolyte analysis. Recommendations for nomenclature, definitions and conventions. Clin Chem Lab Med. 2000;38(4):363–370.',
  },
  {
    id: 'burnett2000b',
    kind: 'guideline',
    citation:
      'Burnett RW, Covington AK, Fogh-Andersen N, et al. Recommendations for measurement of and conventions for reporting sodium and potassium by ion-selective electrodes in undiluted serum, plasma or whole blood. Clin Chem Lab Med. 2000;38(10):1065–1071.',
  },
  {
    id: 'fortgens2011',
    kind: 'article',
    citation: 'Fortgens P, Pillay TS. Pseudohyponatremia revisited: a modern-day pitfall. Arch Pathol Lab Med. 2011;135(4):516–519.',
  },

  /* ───────── Кръвни газове ───────── */
  {
    id: 'clark1956',
    kind: 'article',
    citation: 'Clark LC Jr. Monitor and control of blood and tissue oxygen tensions. Trans Am Soc Artif Intern Organs. 1956;2:41–48.',
  },
  {
    id: 'severinghaus1958',
    kind: 'article',
    citation: 'Severinghaus JW, Bradley AF. Electrodes for blood pO2 and pCO2 determination. J Appl Physiol. 1958;13(3):515–520.',
  },
  {
    id: 'siggaard1974',
    kind: 'textbook',
    citation: 'Siggaard-Andersen O. The Acid-Base Status of the Blood. 4th ed. Copenhagen: Munksgaard; 1974.',
  },
  {
    id: 'clsi-c46',
    kind: 'standard',
    citation: 'Clinical and Laboratory Standards Institute (CLSI). Blood Gas and pH Analysis and Related Measurements; Approved Guideline – Second Edition. CLSI document C46-A2. 2009.',
  },
  {
    id: 'aarc2013',
    kind: 'guideline',
    citation:
      'Davis MD, Walsh BK, Sittig SE, Restrepo RD. AARC clinical practice guideline: blood gas analysis and hemoximetry: 2013. Respir Care. 2013;58(10):1694–1703.',
  },
  {
    id: 'berend2014',
    kind: 'article',
    citation: 'Berend K, de Vries APJ, Gans ROB. Physiological approach to assessment of acid–base disturbances. N Engl J Med. 2014;371(15):1434–1445.',
  },

  /* ───────── Качество и калибрация ───────── */
  {
    id: 'levey1950',
    kind: 'article',
    citation: 'Levey S, Jennings ER. The use of control charts in the clinical laboratory. Am J Clin Pathol. 1950;20(11):1059–1066.',
  },
  {
    id: 'westgard1981',
    kind: 'article',
    citation: 'Westgard JO, Barry PL, Hunt MR, Groth T. A multi-rule Shewhart chart for quality control in clinical chemistry. Clin Chem. 1981;27(3):493–501.',
  },
  {
    id: 'clsi-c24',
    kind: 'standard',
    citation:
      'Clinical and Laboratory Standards Institute (CLSI). Statistical Quality Control for Quantitative Measurement Procedures: Principles and Definitions. CLSI guideline C24. 4th ed. 2016.',
  },
  {
    id: 'iso15189',
    kind: 'standard',
    citation: 'ISO 15189:2022. Medical laboratories – Requirements for quality and competence.',
  },
  {
    id: 'iso17511',
    kind: 'standard',
    citation:
      'ISO 17511:2020. In vitro diagnostic medical devices – Requirements for establishing metrological traceability of values assigned to calibrators, trueness control materials and human samples.',
  },

  /* ───────── Фосфор (молибдатен метод) ───────── */
  {
    id: 'daly1972',
    kind: 'article',
    citation:
      'Daly JA, Ertingshausen G. Direct method for determining inorganic phosphate in serum with the "CentrifiChem". Clin Chem. 1972;18(3):263–265.',
    note: 'Директният метод с нередуциран фосфомолибдатен комплекс при 340 nm.',
  },
  {
    id: 'fiske1925',
    kind: 'article',
    citation: 'Fiske CH, Subbarow Y. The colorimetric determination of phosphorus. J Biol Chem. 1925;66:375–400.',
    note: 'Класическият метод с редукция до молибденово синьо.',
  },
  {
    id: 'nagul2015',
    kind: 'article',
    citation:
      'Nagul EA, McKelvie ID, Worsfold P, Kolev SD. The molybdenum blue reaction for the determination of orthophosphate revisited: opening the black box. Anal Chim Acta. 2015;890:60–82.',
    note: 'Химията на фосфомолибдатния комплекс и на молибденово синьо.',
  },
  {
    id: 'molinaris2020',
    kind: 'article',
    citation:
      'Molinaris V, Bianchetti MG, Milani GP, et al. Interferences in the measurement of circulating phosphate: a literature review. Clin Chem Lab Med. 2020;58(12):1971–1977.',
    note: 'Състояния и вещества, предизвикващи фалшиво променени стойности на фосфата.',
  },
  {
    id: 'mayo-phos',
    kind: 'laboratory',
    citation: 'Mayo Clinic Laboratories. Test catalog: Phosphorus (Inorganic), Serum (PHOS). Електронен ресурс: mayocliniclabs.com.',
    note: 'Изисквания към пробата и референтни интервали по възраст; протоколите на различните лаборатории се различават.',
  },
  {
    id: 'thermo-phos',
    kind: 'manufacturer',
    citation: 'Thermo Fisher Scientific. Inorganic Phosphorus Reagent – Direct UV Method Without Reduction. Листовка на реактив (документ D03112).',
    note: 'Пример за листовка на реактив; дължини на вълната, граници на линейност и интерференции са специфични за реактива.',
  },
  {
    id: 'nhanes-phos',
    kind: 'laboratory',
    citation:
      'Centers for Disease Control and Prevention. NHANES Laboratory Procedure Manual: Phosphorus, refrigerated serum, Beckman Synchron LX20 (цикъл 2005–2006).',
    note: 'Пример за анализатор, отчитащ промяната на абсорбцията при 365 nm.',
  },

  /* ───────── Производители ───────── */
  {
    id: 'inserts',
    kind: 'manufacturer',
    citation:
      'Листовки (package inserts) и ръководства на производителя за конкретния реактив, калибратор и анализатор, използвани в лабораторията.',
    note: 'Задължителен източник за дължини на вълната, състав и обеми на реактивите, интервали на приемливост и процедури – те се различават между производители.',
  },
];

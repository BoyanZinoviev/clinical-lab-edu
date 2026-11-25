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

  /* ───────── Глюкоза (GOD-POD) ───────── */
  {
    id: 'trinder1969',
    kind: 'article',
    citation: 'Trinder P. Determination of glucose in blood using glucose oxidase with an alternative oxygen acceptor. Ann Clin Biochem. 1969;6(1):24–27.',
    note: 'Оригиналното описание на свързаната реакция с глюкозооксидаза, пероксидаза и хромоген (реакция на Trinder).',
  },
  {
    id: 'barham1972',
    kind: 'article',
    citation: 'Barham D, Trinder P. An improved colour reagent for the determination of blood glucose by the oxidase system. Analyst. 1972;97(1151):142–145.',
    note: 'Подобрен хромогенен реагент (4-аминофеназон) с висока чувствителност при около 515 nm.',
  },
  {
    id: 'sacks2011',
    kind: 'article',
    citation: 'Sacks DB. A1C versus glucose testing: a comparison. Diabetes Care. 2011;34(2):518–523.',
    note: 'Гликолиза in vitro: спадане на глюкозата с около 5–7 % на час и ролята на флуорида.',
  },
  {
    id: 'ada2026',
    kind: 'guideline',
    citation:
      'American Diabetes Association Professional Practice Committee. 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S27–S49.',
    note: 'Диагностични критерии по плазмена глюкоза на гладно; определение за „гладно“.',
  },
  {
    id: 'who2006',
    kind: 'guideline',
    citation:
      'World Health Organization, International Diabetes Federation. Definition and diagnosis of diabetes mellitus and intermediate hyperglycaemia: report of a WHO/IDF consultation. Geneva: WHO; 2006.',
    note: 'Критерии на СЗО за диабет и междинна хипергликемия.',
  },
  {
    id: 'thermo-glu',
    kind: 'manufacturer',
    citation: 'Thermo Fisher Scientific. Infinity Glucose Oxidase Liquid Stable Reagent. Листовка на реактив.',
    note: 'Пример за GOD-POD реактив с 4-аминоантипирин и 4-хидроксибензоена киселина; червено хинонеимино багрило, измервано в диапазон 460–560 nm.',
  },

  /* ───────── Креатинин (метод на Яфе) ───────── */
  {
    id: 'delanghe2011',
    kind: 'article',
    citation: 'Delanghe JR, Speeckaert MM. Creatinine determination according to Jaffe – what does it stand for? Clin Kidney J. 2011;4(2):83–86.',
    note: 'История на реакцията (Jaffé, 1886; Folin), псевдохромогени и липсата на единна стандартна рецепта.',
  },
  {
    id: 'peake2006',
    kind: 'article',
    citation: 'Peake M, Whiting M. Measurement of serum creatinine – current status and future goals. Clin Biochem Rev. 2006;27(4):173–184.',
    note: 'Кинетични и компенсирани методи на Яфе, интерференции с посока, ензимни методи.',
  },
  {
    id: 'myers2006',
    kind: 'guideline',
    citation:
      'Myers GL, Miller WG, Coresh J, et al. Recommendations for improving serum creatinine measurement: a report from the Laboratory Working Group of the National Kidney Disease Education Program. Clin Chem. 2006;52(1):5–18.',
    note: 'Стандартизация на креатинина и проследимост към референтен метод с изотопно разреждане и масспектрометрия (IDMS).',
  },
  {
    id: 'drion2012',
    kind: 'article',
    citation:
      'Drion I, Cobbaert C, Groenier KH, et al. Clinical evaluation of analytical variations in serum creatinine measurements: why laboratories should abandon Jaffe techniques. BMC Nephrol. 2012;13:133.',
    note: 'Сравнение на методите на Яфе и ензимните методи в схема за външна оценка на качеството.',
  },
  {
    id: 'weber1991',
    kind: 'article',
    citation: 'Weber JA, van Zanten AP. Interferences in current methods for measurements of creatinine. Clin Chem. 1991;37:695–700.',
    note: 'Преглед на интерференциите при методите за измерване на креатинин.',
  },
  {
    id: 'chromy2008',
    kind: 'article',
    citation:
      'Chromý V, Rozkošná K, Sedlák P. Determination of serum creatinine by Jaffe method and how to calibrate to eliminate matrix interference problems. Clin Chem Lab Med. 2008;46:1127–1133.',
    note: 'Ограничения на корекцията с постоянна стойност при методите на Яфе (напр. при деца).',
  },
  {
    id: 'inker2021',
    kind: 'article',
    citation: 'Inker LA, Eneanya ND, Coresh J, et al. New creatinine- and cystatin C-based equations to estimate GFR without race. N Engl J Med. 2021;385(19):1737–1749.',
    note: 'Уравнението CKD-EPI 2021 за оценка на скоростта на гломерулна филтрация от креатинин.',
  },
  {
    id: 'kdigo2024',
    kind: 'guideline',
    citation:
      'Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group. KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. Kidney Int. 2024;105(4S):S117–S314.',
    note: 'Оценка и класификация на хроничната бъбречна болест.',
  },
  {
    id: 'mayo-crea',
    kind: 'laboratory',
    citation: 'Mayo Clinic. Creatinine test: results (типични стойности при възрастни). Електронен ресурс: mayoclinic.org.',
    note: 'Ориентировъчни стойности при мъже и жени и фактори като месо и креатинови добавки; всяка лаборатория използва свой референтен интервал.',
  },
  {
    id: 'sekisui-crea',
    kind: 'manufacturer',
    citation: 'Sekisui Diagnostics. Creatinine S – Package insert (кинетичен метод на Яфе).',
    note: 'Пример за листовка: алкална среда, пикрат, нарастване на абсорбцията при 510 nm; съдържа исторически бележки за Jaffé и Folin (1904).',
  },
  {
    id: 'roche-crej2',
    kind: 'manufacturer',
    citation: 'Roche Diagnostics. Creatinine Jaffé Gen.2 (CREJ2) – Листовка на метода за системи cobas c.',
    note: 'Пример за компенсиран кинетичен метод: резултатите за серум и плазма се коригират с −26 µmol/L (−0,3 mg/dL) заради протеини и кетони.',
  },
  {
    id: 'spinreact-crea',
    kind: 'manufacturer',
    citation: 'SPINREACT S.A.U. Creatinine – Jaffé, colorimetric, kinetic. Листовка на реактив.',
    note: 'Пример за кинетичен реактив: абсорбцията се отчита 30 s и 90 s след добавяне на пробата; резултатът се изчислява спрямо стандарт с известна концентрация (в листовката – 2 mg/dL).',
  },

  /* ───────── Фракциониране на белтъци ───────── */
  {
    id: 'jenkins2009',
    kind: 'article',
    citation: 'Jenkins MA. Serum and urine electrophoresis for detection and identification of monoclonal proteins. Clin Biochem Rev. 2009;30(3):119–122.',
    note: 'История от течна среда през агароза до капилярна електрофореза; основна цел на SPE – откриване на парапротеин; агароза с 5 и повече ленти.',
  },
  {
    id: 'aafp-spe2005',
    kind: 'article',
    citation: 'O’Connell TX, Horita TJ, Kasravi B. Understanding and interpreting serum protein electrophoresis. Am Fam Physician. 2005;71(1):105–112.',
    note: 'Фракции на серумните белтъци и общ преглед на моделите; образователен източник.',
  },
  {
    id: 'johansson1972',
    kind: 'article',
    citation: 'Johansson BG. Agarose gel electrophoresis. Scand J Clin Lab Invest. 1972;29(Suppl 124):7–19.',
    note: 'Проста техника с агароза: 15 проби за по-малко от час; приложима за плазмени белтъци и липопротеини.',
  },
  {
    id: 'jeppsson1979',
    kind: 'article',
    citation: 'Jeppsson JO, Laurell CB, Franzén B. Agarose gel electrophoresis. Clin Chem. 1979;25(4):629–638.',
    note: 'Общ преглед на електрофорезата в агарозен гел.',
  },
  {
    id: 'dennis1987',
    kind: 'article',
    citation: 'Dennis PM, Biegler B, Papas R. Improved measurement of monoclonal paraproteins in serum using agarose gel electrophoresis. Ann Clin Biochem. 1987;24(1):73–76.',
    note: 'Денситометрия при около 520 nm след оцветяване с Coomassie Brilliant Blue G.',
  },
  {
    id: 'bossuyt2003',
    kind: 'article',
    citation: 'Bossuyt X. Separation of serum proteins by automated capillary zone electrophoresis. Clin Chem Lab Med. 2003;41(6):762–772.',
    note: 'Автоматизирана капилярна зонална електрофореза на серумни белтъци; откриване и идентифициране на моноклонални белтъци; специфични интерференции.',
  },
  {
    id: 'keir1990',
    kind: 'article',
    citation: 'Keir G, Luxton RW, Thompson EJ. Isoelectric focusing of cerebrospinal fluid immunoglobulin G: an annotated update. Ann Clin Biochem. 1990;27:436–443.',
    note: 'IEF в агароза за откриване на олигоклонален IgG в ликвор.',
  },
  {
    id: 'birmingham-ocb',
    kind: 'laboratory',
    citation: 'University of Birmingham, Clinical Immunology Service. Samples, method and oligoclonal bands (OCBs) – информационна страница за лабораторията.',
    note: 'Необходимост от успоредна серумна проба; две или повече ленти само в ликвора; IEF като най-чувствителен метод.',
  },
  {
    id: 'ofarrell1975',
    kind: 'article',
    citation: 'O’Farrell PH. High resolution two-dimensional electrophoresis of proteins. J Biol Chem. 1975;250(10):4007–4021.',
    note: 'Класическият метод на 2D електрофореза: IEF в първо и SDS-PAGE във второ измерение.',
  },
  {
    id: 'anderson1977',
    kind: 'article',
    citation: 'Anderson NL, Anderson NG. High resolution two-dimensional electrophoresis of human plasma proteins. Proc Natl Acad Sci USA. 1977;74(12):5421–5425.',
    note: 'Двумерна карта на плазмените белтъци на човека.',
  },
  {
    id: 'amersham-iex',
    kind: 'manufacturer',
    citation: 'Amersham Biosciences. Ion Exchange Chromatography: Principles and Methods. Handbook 18-1114-21.',
    note: 'Принципи на йонообменната хроматография: смоли, избор на pH и градиентно елуиране.',
  },
  {
    id: 'amersham-affinity',
    kind: 'manufacturer',
    citation: 'Amersham Biosciences. Affinity Chromatography: Principles and Methods. Handbook 18-1022-29.',
    note: 'Принципи на афинитетната хроматография: лиганди, свързване, промиване и елуиране.',
  },
  {
    id: 'cuatrecasas1968',
    kind: 'article',
    citation: 'Cuatrecasas P, Wilchek M, Anfinsen CB. Selective enzyme purification by affinity chromatography. Proc Natl Acad Sci USA. 1968;61(2):636–643.',
    note: 'Класическо описание на афинитетната хроматография с ковалентно закрепен лиганд.',
  },
  {
    id: 'travis1976',
    kind: 'article',
    citation: 'Travis J, Bowen J, Tewksbury D, Johnson D, Pannell R. Isolation of albumin from whole human plasma and fractionation of albumin-depleted plasma. Biochem J. 1976;157(2):301–306.',
    note: 'Cibacron Blue–Sepharose отнема около 98 % от албумина; остатъкът се фракционира с йонообмен върху DEAE-целулоза.',
  },
  {
    id: 'gianazza1982',
    kind: 'article',
    citation: 'Gianazza E, Arnaud P. A general method for fractionation of plasma proteins: dye-ligand affinity chromatography on immobilized Cibacron Blue F3-GA. Biochem J. 1982;201(1):129–136.',
    note: 'Cibacron Blue свързва и други плазмени белтъци – не е напълно специфичен.',
  },
  {
    id: 'sigma-lmhplc',
    kind: 'manufacturer',
    citation: 'MilliporeSigma. Large molecule HPLC – режими за белтъци: обратнофазов, гел-филтрационен, йонообменен и хидрофобен (технически материал).',
    note: 'Общ преглед на HPLC режимите за големи молекули.',
  },
  {
    id: 'merck-blue',
    kind: 'manufacturer',
    citation: 'Cytiva / MilliporeSigma. Purification or removal of albumin: Blue Sepharose and Capto Blue (технически протокол).',
    note: 'Cibacron Blue F3G-A свързва албумин електростатично и/или хидрофобно; свързва и някои ензими и други белтъци.',
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

/* Códigos CIE-10 más frecuentes en medicina general */
export const CIE10 = [
  // Infecciosas
  { code: 'A09',   desc: 'Diarrea y gastroenteritis de presunto origen infeccioso' },
  { code: 'A15',   desc: 'Tuberculosis respiratoria' },
  { code: 'A36',   desc: 'Difteria' },
  { code: 'A37',   desc: 'Tos ferina' },
  { code: 'A90',   desc: 'Dengue clásico' },
  { code: 'A91',   desc: 'Dengue hemorrágico' },
  { code: 'B00',   desc: 'Infecciones por virus herpes simple' },
  { code: 'B01',   desc: 'Varicela' },
  { code: 'B05',   desc: 'Sarampión' },
  { code: 'B06',   desc: 'Rubéola' },
  { code: 'B26',   desc: 'Parotiditis epidémica (paperas)' },
  { code: 'B34.9', desc: 'Infección viral no especificada' },
  { code: 'B37',   desc: 'Candidiasis' },

  // Neoplasias
  { code: 'C50',   desc: 'Tumor maligno de mama' },
  { code: 'C53',   desc: 'Tumor maligno del cuello uterino' },
  { code: 'C61',   desc: 'Tumor maligno de próstata' },
  { code: 'C80',   desc: 'Tumor maligno sin especificación de sitio' },
  { code: 'D25',   desc: 'Leiomioma del útero (mioma)' },

  // Sangre
  { code: 'D50',   desc: 'Anemia por deficiencia de hierro' },
  { code: 'D64.9', desc: 'Anemia no especificada' },

  // Endocrinas / Metabólicas
  { code: 'E03.9', desc: 'Hipotiroidismo no especificado' },
  { code: 'E05',   desc: 'Tirotoxicosis (hipertiroidismo)' },
  { code: 'E10',   desc: 'Diabetes mellitus tipo 1' },
  { code: 'E11',   desc: 'Diabetes mellitus tipo 2' },
  { code: 'E11.9', desc: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { code: 'E14',   desc: 'Diabetes mellitus no especificada' },
  { code: 'E66',   desc: 'Obesidad' },
  { code: 'E78',   desc: 'Trastornos del metabolismo de lipoproteínas' },
  { code: 'E78.0', desc: 'Hipercolesterolemia pura' },
  { code: 'E78.5', desc: 'Hiperlipidemia no especificada' },
  { code: 'E83.5', desc: 'Trastornos del metabolismo del calcio' },

  // Mentales
  { code: 'F10',   desc: 'Trastornos mentales por uso de alcohol' },
  { code: 'F32',   desc: 'Episodio depresivo' },
  { code: 'F40',   desc: 'Trastornos de ansiedad fóbica' },
  { code: 'F41',   desc: 'Otros trastornos de ansiedad' },
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada' },
  { code: 'F43.1', desc: 'Trastorno de estrés postraumático' },
  { code: 'F51',   desc: 'Trastornos del sueño no orgánicos' },

  // Neurológicas
  { code: 'G20',   desc: 'Enfermedad de Parkinson' },
  { code: 'G35',   desc: 'Esclerosis múltiple' },
  { code: 'G40',   desc: 'Epilepsia' },
  { code: 'G43',   desc: 'Migraña' },
  { code: 'G43.9', desc: 'Migraña no especificada' },
  { code: 'G44',   desc: 'Otros síndromes de cefalea' },
  { code: 'G62',   desc: 'Otras polineuropatías' },

  // Ojo
  { code: 'H10',   desc: 'Conjuntivitis' },
  { code: 'H25',   desc: 'Catarata senil' },
  { code: 'H35',   desc: 'Otros trastornos de retina' },
  { code: 'H40',   desc: 'Glaucoma' },
  { code: 'H52',   desc: 'Trastornos de la acomodación y refracción' },

  // Oído
  { code: 'H65',   desc: 'Otitis media no supurativa' },
  { code: 'H66',   desc: 'Otitis media supurativa' },
  { code: 'H81',   desc: 'Trastornos de la función vestibular (vértigo)' },

  // Cardiovasculares
  { code: 'I10',   desc: 'Hipertensión esencial (primaria)' },
  { code: 'I20',   desc: 'Angina de pecho' },
  { code: 'I21',   desc: 'Infarto agudo de miocardio' },
  { code: 'I25',   desc: 'Enfermedad isquémica crónica del corazón' },
  { code: 'I48',   desc: 'Fibrilación y aleteo auricular' },
  { code: 'I50',   desc: 'Insuficiencia cardíaca' },
  { code: 'I63',   desc: 'Infarto cerebral' },
  { code: 'I64',   desc: 'Accidente vascular encefálico (EVC)' },
  { code: 'I83',   desc: 'Várices de extremidades inferiores' },

  // Respiratorias
  { code: 'J00',   desc: 'Rinofaringitis aguda (resfriado común)' },
  { code: 'J01',   desc: 'Sinusitis aguda' },
  { code: 'J02',   desc: 'Faringitis aguda' },
  { code: 'J03',   desc: 'Amigdalitis aguda' },
  { code: 'J06',   desc: 'Infección aguda de vías respiratorias superiores' },
  { code: 'J06.9', desc: 'Infección aguda de vías respiratorias superiores no especificada' },
  { code: 'J18',   desc: 'Neumonía, microorganismo no especificado' },
  { code: 'J20',   desc: 'Bronquitis aguda' },
  { code: 'J30',   desc: 'Rinitis alérgica y vasomotora' },
  { code: 'J44',   desc: 'EPOC (Enfermedad pulmonar obstructiva crónica)' },
  { code: 'J45',   desc: 'Asma' },
  { code: 'J45.9', desc: 'Asma no especificada' },

  // Digestivas
  { code: 'K02',   desc: 'Caries dental' },
  { code: 'K21',   desc: 'Enfermedad por reflujo gastroesofágico (ERGE)' },
  { code: 'K25',   desc: 'Úlcera gástrica' },
  { code: 'K26',   desc: 'Úlcera duodenal' },
  { code: 'K29',   desc: 'Gastritis y duodenitis' },
  { code: 'K35',   desc: 'Apendicitis aguda' },
  { code: 'K57',   desc: 'Enfermedad diverticular del intestino' },
  { code: 'K59.0', desc: 'Estreñimiento' },
  { code: 'K70',   desc: 'Enfermedad alcohólica del hígado' },
  { code: 'K74',   desc: 'Cirrosis hepática' },
  { code: 'K76',   desc: 'Hígado graso no alcohólico (NAFLD)' },
  { code: 'K80',   desc: 'Colelitiasis (piedras en vesícula)' },
  { code: 'K81',   desc: 'Colecistitis' },
  { code: 'K92.1', desc: 'Melena' },

  // Piel
  { code: 'L20',   desc: 'Dermatitis atópica' },
  { code: 'L30',   desc: 'Otras dermatitis' },
  { code: 'L40',   desc: 'Psoriasis' },
  { code: 'L50',   desc: 'Urticaria' },

  // Músculo-esqueléticas
  { code: 'M06',   desc: 'Artritis reumatoide' },
  { code: 'M10',   desc: 'Gota' },
  { code: 'M15',   desc: 'Poliartrosis' },
  { code: 'M17',   desc: 'Gonartrosis (artrosis de rodilla)' },
  { code: 'M47',   desc: 'Espondiloartrosis' },
  { code: 'M51',   desc: 'Trastornos de discos intervertebrales lumbares' },
  { code: 'M54',   desc: 'Dorsalgia' },
  { code: 'M54.5', desc: 'Lumbalgia (dolor lumbar)' },
  { code: 'M75',   desc: 'Lesiones del hombro (manguito rotador)' },
  { code: 'M79.1', desc: 'Mialgia' },
  { code: 'M79.3', desc: 'Paniculitis' },

  // Urológicas / Renales
  { code: 'N10',   desc: 'Nefritis tubulointersticial aguda' },
  { code: 'N18',   desc: 'Enfermedad renal crónica' },
  { code: 'N20',   desc: 'Cálculos del riñón y del uréter (nefrolitiasis)' },
  { code: 'N30',   desc: 'Cistitis' },
  { code: 'N39.0', desc: 'Infección de vías urinarias (IVU)' },
  { code: 'N40',   desc: 'Hiperplasia benigna de próstata (HBP)' },

  // Embarazo / Parto
  { code: 'O10',   desc: 'Hipertensión preexistente en embarazo' },
  { code: 'O24',   desc: 'Diabetes mellitus en el embarazo' },
  { code: 'O80',   desc: 'Parto único espontáneo' },

  // Síntomas / Signos generales
  { code: 'R00',   desc: 'Anomalías del latido cardíaco (palpitaciones)' },
  { code: 'R05',   desc: 'Tos' },
  { code: 'R06',   desc: 'Anomalías de la respiración (disnea)' },
  { code: 'R10',   desc: 'Dolor abdominal y pélvico' },
  { code: 'R51',   desc: 'Cefalea' },
  { code: 'R53',   desc: 'Malestar y fatiga' },
  { code: 'R55',   desc: 'Síncope y colapso' },
  { code: 'R68.9', desc: 'Síntoma o signo no especificado' },

  // Traumatismos
  { code: 'S00',   desc: 'Traumatismo superficial de cabeza' },
  { code: 'S06',   desc: 'Traumatismo intracraneal (TCE)' },
  { code: 'S52',   desc: 'Fractura del antebrazo' },
  { code: 'S72',   desc: 'Fractura de fémur' },
  { code: 'T14',   desc: 'Traumatismo de región del cuerpo no especificada' },

  // COVID / Viral (recientes)
  { code: 'U07.1', desc: 'COVID-19 (virus identificado)' },
  { code: 'U07.2', desc: 'COVID-19 (virus no identificado / sospechoso)' },

  // Chequeo / Sin enfermedad
  { code: 'Z00',   desc: 'Examen médico general (chequeo)' },
  { code: 'Z30',   desc: 'Anticoncepción' },
  { code: 'Z34',   desc: 'Supervisión de embarazo normal' },
  { code: 'Z76.9', desc: 'Contacto con servicios de salud sin especificación' },
]

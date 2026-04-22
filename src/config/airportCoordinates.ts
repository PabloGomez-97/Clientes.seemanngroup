export interface AirportCoords {
  lat: number;
  lng: number;
  name: string;
  iata: string;
  countryCode?: string;
}

/**
 * Coordenadas de aeropuertos mapeados por su nombre normalizado (lowercase).
 * Se utiliza para trazar la ruta desde la dirección de recogida hasta el aeropuerto de origen.
 */
export const airportCoordinates: Record<string, AirportCoords> = {
  houston: {
    lat: 29.9902,
    lng: -95.3368,
    name: "George Bush Intercontinental Airport",
    iata: "IAH",
    countryCode: "US",
  },
  madrid: {
    lat: 40.4983,
    lng: -3.5676,
    name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
    iata: "MAD",
    countryCode: "ES",
  },
  shanghai: {
    lat: 31.1443,
    lng: 121.8083,
    name: "Shanghai Pudong International Airport",
    iata: "PVG",
    countryCode: "CN",
  },
  sudafrica: {
    lat: -26.1311,
    lng: 28.2316,
    name: "O.R. Tambo International Airport",
    iata: "JNB",
    countryCode: "ZA",
  },
  miami: {
    lat: 25.7952,
    lng: -80.2784,
    name: "Miami International Airport",
    iata: "MIA",
    countryCode: "US",
  },
  barcelona: {
    lat: 41.3040,
    lng: 2.0789,
    name: "Barcelona-El Prat Airport",
    iata: "BCN",
    countryCode: "ES",
  },
  londres: {
    lat: 51.4694,
    lng: -0.4535,
    name: "London Heathrow Airport",
    iata: "LHR",
    countryCode: "GB",
  },
  Fráncfort: {
    lat: 50.0485,
    lng: 8.5586,
    name: "Frankfurt am Main Airport",
    iata: "FRA",
    countryCode: "DE",
  },
  brasil: {
    lat: -23.0100,
    lng: -47.1449,
    name: "Campinas Viracopos International Airport",
    iata: "VCP",
    countryCode: "BR",
  },
  brazil: {
    lat: -23.4241,
    lng: -46.4784,
    name: "São Paulo-Guarulhos International Airport",
    iata: "GRU",
    countryCode: "BR",
  },
  hong: {
    lat: 22.3132,
    lng: 113.9371,
    name: "Hong Kong International Airport",
    iata: "HKG",
    countryCode: "HK",
  },
  Milán: {
    lat: 45.6272,
    lng: 8.7125,
    name: "Milan Malpensa Airport",
    iata: "MXP",
    countryCode: "IT",
  },
  lisboa: {
    lat: 38.7729,
    lng: -9.1278,
    name: "Lisbon Humberto Delgado Airport",
    iata: "LIS",
    countryCode: "PT",
  },
  nanjin: {
    lat: 31.7342,
    lng: 118.8714,
    name: "Nanjing Lukou International Airport",
    iata: "NKG",
    countryCode: "CN",
  },
  santiago: {
    lat: -33.3972,
    lng: -70.7931,
    name: "Comodoro Arturo Merino Benítez International Airport",
    iata: "SCL",
    countryCode: "CL",
  },
  nankin: {
    lat: 31.7337,
    lng: 118.8716,
    name: "Nanjing Lukou International Airport",
    iata: "NKG",
    countryCode: "CN",
  },
  helsinki: {
    lat: 60.3164,
    lng: 24.9673,
    name: "Helsinki-Vantaa Airport",
    iata: "HEL",
    countryCode: "FI",
  },
  ahmedabad: {
    lat: 23.0717,
    lng: 72.6266,
    name: "Sardar Vallabhbhai Patel International Airport",
    iata: "AMD",
    countryCode: "IN",
  },
  amsterdam: {
    lat: 52.3113,
    lng: 4.7644,
    name: "Amsterdam Airport Schiphol",
    iata: "AMS",
    countryCode: "NL",
  },
  asuncion: {
    lat: -25.2397,
    lng: -57.5194,
    name: "Aeropuerto Internacional Silvio Pettirossi",
    iata: "ASU",
    countryCode: "PY",
  },
  atenas: {
    lat: 37.9364,
    lng: 23.9447,
    name: "Athens International Airport Eleftherios Venizelos",
    iata: "ATH",
    countryCode: "GR",
  },
  atlanta: {
    lat: 33.6407,
    lng: -84.4444,
    name: "Hartsfield-Jackson Atlanta International Airport",
    iata: "ATL",
    countryCode: "US",
  },
  auckland: {
    lat: -37.004595,
    lng: 174.782463,
    name: "Auckland Airport",
    iata: "AKL",
    countryCode: "NZ",
  },
  bangkok: {
    lat: 13.6896,
    lng: 100.7501,
    name: "Suvarnabhumi Airport",
    iata: "BKK",
    countryCode: "TH",
  },
  berlin: {
    lat: 52.3644,
    lng: 13.5097,
    name: "Berlin Brandenburg Airport",
    iata: "BER",
    countryCode: "DE",
  },
  billund: {
    lat: 55.7423,
    lng: 9.1528,
    name: "Billund Airport",
    iata: "BLL",
    countryCode: "DK",
  },
  bogota: {
    lat: 4.7011,
    lng: -74.1469,
    name: "Aeropuerto Internacional El Dorado",
    iata: "BOG",
    countryCode: "CO",
  },
  bolonia: {
    lat: 44.5303,
    lng: 11.2863,
    name: "Aeroporto Guglielmo Marconi di Bologna",
    iata: "BLQ",
    countryCode: "IT",
  },
  bombay: {
    lat: 19.0988,
    lng: 72.8744,
    name: "Chhatrapati Shivaji Maharaj International Airport",
    iata: "BOM",
  },
  bratislava: {
    lat: 48.1697,
    lng: 17.1994,
    name: "Letisko M. R. Štefánika",
    iata: "BTS",
  },
  brisbane: {
    lat: -27.3831,
    lng: 153.1215,
    name: "Brisbane Airport",
    iata: "BNE",
  },
  buenos_aires: {
    lat: -34.5583,
    lng: -58.4156,
    name: "Aeroparque Internacional Jorge Newbery",
    iata: "AEP",
  },
  bruselas: {
    lat: 50.8988,
    lng: 4.4828,
    name: "Brussels Airport",
    iata: "BRU",
  },
  bucarest: {
    lat: 44.5711,
    lng: 26.0850,
    name: "Henri Coandă International Airport",
    iata: "OTP",
  },
  cali: {
    lat: 3.5411,
    lng: -76.3846,
    name: "Aeropuerto Internacional Alfonso Bonilla Aragón",
    iata: "CLO",
  },
  canton: {
    lat: 23.3924,
    lng: 113.2988,
    name: "Guangzhou Baiyun International Airport",
    iata: "CAN",
  },
  casablanca: {
    lat: 33.3675,
    lng: -7.5816,
    name: "Mohammed V International Airport",
    iata: "CMN",
  },
  cebu: {
    lat: 10.3254,
    lng: 123.9792,
    name: "Mactan-Cebu International Airport",
    iata: "CEB",
  },
  chennai: {
    lat: 12.9822,
    lng: 80.1636,
    name: "Chennai International Airport",
    iata: "MAA",
  },
  chicago: {
    lat: 41.9776,
    lng: -87.9042,
    name: "O'Hare International Airport",
    iata: "ORD",
  },
  chongqing: {
    lat: 29.7196,
    lng: 106.6416,
    name: "Chongqing Jiangbei International Airport",
    iata: "CKG",
  },
  ciudad_de_guatemala: {
    lat: 14.5826,
    lng: -90.5268,
    name: "Aeropuerto Internacional La Aurora",
    iata: "GUA",
  },
  ciudad_de_mexico: {
    lat: 19.4363,
    lng: -99.0725,
    name: "Aeropuerto Internacional Benito Juárez",
    iata: "MEX",
  },
  ciudad_de_panama: {
    lat: 9.0713,
    lng: -79.3834,
    name: "Aeropuerto Internacional de Tocumen",
    iata: "PTY",
  },
  ciudad_ho_chi_minh: {
    lat: 10.8149,
    lng: 106.6661,
    name: "Tan Son Nhat International Airport",
    iata: "SGN",
  },
  cochabamba: {
    lat: -17.4194,
    lng: -66.1772,
    name: "Aeropuerto Internacional Jorge Wilstermann",
    iata: "CBB",
  },
  colonia: {
    lat: 50.8783,
    lng: 7.1222,
    name: "Cologne Bonn Airport",
    iata: "CGN",
  },
  copenhague: {
    lat: 55.6298,
    lng: 12.6489,
    name: "Copenhagen Airport",
    iata: "CPH",
  },
  cork: {
    lat: 51.8492,
    lng: -8.4907,
    name: "Cork Airport",
    iata: "ORK",
  },
  cracovia: {
    lat: 50.0777,
    lng: 19.8006,
    name: "Kraków John Paul II International Airport",
    iata: "KRK",
  },
  dallas: {
    lat: 32.8998,
    lng: -97.0403,
    name: "Dallas/Fort Worth International Airport",
    iata: "DFW",
  },
  denpasar: {
    lat: -8.7454,
    lng: 115.1668,
    name: "Ngurah Rai International Airport",
    iata: "DPS",
  },
  doha: {
    lat: 25.2635,
    lng: 51.6138,
    name: "Hamad International Airport",
    iata: "DOH",
  },
  dubai: {
    lat: 25.2532,
    lng: 55.3657,
    name: "Dubai International Airport",
    iata: "DXB",
  },
  dublin: {
    lat: 53.4283,
    lng: -6.2422,
    name: "Dublin Airport",
    iata: "DUB",
  },
  durban: {
    lat: -29.6105,
    lng: 31.1147,
    name: "King Shaka International Airport",
    iata: "DUR",
  },
  edimburgo: {
    lat: 55.9485,
    lng: -3.3644,
    name: "Edinburgh Airport",
    iata: "EDI",
  },
  eindhoven: {
    lat: 51.4533,
    lng: 5.3857,
    name: "Eindhoven Airport",
    iata: "EIN",
  },
  el_cairo: {
    lat: 30.1118,
    lng: 31.4136,
    name: "Cairo International Airport",
    iata: "CAI",
  },
  encarnacion: {
    lat: -27.2274,
    lng: -55.8361,
    name: "Aeropuerto Teniente Amin Ayub Gonzalez",
    iata: "ENO",
  },
  estambul: {
    lat: 41.2612,
    lng: 28.7431,
    name: "Istanbul Airport",
    iata: "IST",
  },
  estocolmo: {
    lat: 59.6483,
    lng: 17.9258,
    name: "Stockholm Arlanda Airport",
    iata: "ARN",
  },
  ezeiza: {
    lat: -34.8152,
    lng: -58.5368,
    name: "Aeropuerto Internacional Ministro Pistarini",
    iata: "EZE",
  },
  filadelfia: {
    lat: 39.8787,
    lng: -75.2415,
    name: "Philadelphia International Airport",
    iata: "PHL",
  },
  florencia: {
    lat: 43.8087,
    lng: 11.2012,
    name: "Amerigo Vespucci Airport",
    iata: "FLR",
  },
  gibraltar: {
    lat: 36.1517,
    lng: -5.3486,
    name: "Gibraltar International Airport",
    iata: "GIB",
  },
  gotemburgo: {
    lat: 57.6657,
    lng: 12.2854,
    name: "Göteborg Landvetter Airport",
    iata: "GOT",
  },
  greven: {
    lat: 52.1345,
    lng: 7.6853,
    name: "Münster Osnabrück International Airport",
    iata: "FMO",
  },
  guadalajara: {
    lat: 20.5284,
    lng: -103.3082,
    name: "Aeropuerto Internacional de Guadalajara",
    iata: "GDL",
  },
  guayaquil: {
    lat: -2.1557,
    lng: -79.8837,
    name: "Aeropuerto Internacional José Joaquín de Olmedo",
    iata: "GYE",
  },
  hamburgo: {
    lat: 53.6331,
    lng: 9.9984,
    name: "Hamburg Airport",
    iata: "HAM",
  },
  hannover: {
    lat: 52.4593,
    lng: 9.6841,
    name: "Hannover Airport",
    iata: "HAJ",
  },
  heligoland: {
    lat: 54.1866,
    lng: 7.9161,
    name: "Heligoland Airport",
    iata: "HGL",
  },
  hubballi: {
    lat: 15.3614,
    lng: 75.0847,
    name: "Hubballi Airport",
    iata: "HBX",
  },
  inverness: {
    lat: 57.5413,
    lng: -4.0475,
    name: "Inverness Airport",
    iata: "INV",
  },
  islamabad: {
    lat: 33.5516,
    lng: 72.8291,
    name: "Islamabad International Airport",
    iata: "ISB",
  },
  jessore: {
    lat: 23.1818,
    lng: 89.1578,
    name: "Jessore Airport",
    iata: "JSR",
  },
  kaliningrado: {
    lat: 54.8878,
    lng: 20.5901,
    name: "Khrabrovo Airport",
    iata: "KGD",
  },
  kandahar: {
    lat: 31.5056,
    lng: 65.8475,
    name: "Ahmad Shah Baba International Airport",
    iata: "KDH",
  },
  karachi: {
    lat: 24.8979,
    lng: 67.1601,
    name: "Jinnah International Airport",
    iata: "KHI",
  },
  kuala_lumpur: {
    lat: 2.7483,
    lng: 101.6963,
    name: "Kuala Lumpur International Airport",
    iata: "KUL",
  },
  la_paz: {
    lat: -16.5133,
    lng: -68.1916,
    name: "Aeropuerto Internacional El Alto",
    iata: "LPB",
  },
  lahore: {
    lat: 31.5218,
    lng: 74.4037,
    name: "Allama Iqbal International Airport",
    iata: "LHE",
  },
  lima: {
    lat: -12.0239,
    lng: -77.1084,
    name: "Aeropuerto Internacional Jorge Chávez",
    iata: "LIM",
  },
  liubliana: {
    lat: 46.2255,
    lng: 14.4552,
    name: "Ljubljana Jože Pučnik Airport",
    iata: "LJU",
  },
  los_angeles: {
    lat: 33.9427,
    lng: -118.4069,
    name: "Los Angeles International Airport",
    iata: "LAX",
  },
  luanda: {
    lat: -8.8572,
    lng: 13.2307,
    name: "Quatro de Fevereiro International Airport",
    iata: "LAD",
  },
  lyon: {
    lat: 45.7226,
    lng: 5.0768,
    name: "Lyon-Saint Exupéry Airport",
    iata: "LYS",
  },
  macao: {
    lat: 22.1481,
    lng: 113.5909,
    name: "Macau International Airport",
    iata: "MFM",
  },
  malaga: {
    lat: 36.6749,
    lng: -4.4984,
    name: "Málaga-Costa del Sol Airport",
    iata: "AGP",
  },
  manaos: {
    lat: -3.0368,
    lng: -60.0504,
    name: "Aeropuerto Internacional Eduardo Gomes",
    iata: "MAO",
  },
  marrakech: {
    lat: 31.6019,
    lng: -8.0264,
    name: "Marrakesh Menara Airport",
    iata: "RAK",
  },
  marsella: {
    lat: 43.4384,
    lng: 5.2155,
    name: "Marseille Provence Airport",
    iata: "MRS",
  },
  medellin: {
    lat: 6.1666,
    lng: -75.4231,
    name: "Aeropuerto Internacional José María Córdova",
    iata: "MDE",
  },
  melbourne: {
    lat: -37.6698,
    lng: 144.8465,
    name: "Melbourne Airport",
    iata: "MEL",
  },
  monterrey: {
    lat: 25.7779,
    lng: -100.1066,
    name: "Aeropuerto Internacional de Monterrey",
    iata: "MTY",
  },
  montevideo: {
    lat: -34.8384,
    lng: -56.0308,
    name: "Aeropuerto Internacional de Carrasco",
    iata: "MVD",
  },
  montreal: {
    lat: 45.4687,
    lng: -73.7431,
    name: "Montréal-Pierre Elliott Trudeau International Airport",
    iata: "YUL",
  },
  moscu: {
    lat: 55.9736,
    lng: 37.4124,
    name: "Sheremetyevo International Airport",
    iata: "SVO",
  },
  mount_pleasant: {
    lat: -51.8231,
    lng: -58.4472,
    name: "Mount Pleasant Airport",
    iata: "MPN",
  },
  munich: {
    lat: 48.3533,
    lng: 11.7828,
    name: "Munich Airport",
    iata: "MUC",
  },
  nicosia: {
    lat: 34.8755,
    lng: 33.6247,
    name: "Larnaca International Airport",
    iata: "LCA",
  },
  ningbo: {
    lat: 29.8267,
    lng: 121.4619,
    name: "Ningbo Lishe International Airport",
    iata: "NGB",
  },
  nueva_delhi: {
    lat: 28.5559,
    lng: 77.0963,
    name: "Indira Gandhi International Airport",
    iata: "DEL",
  },
  nueva_york: {
    lat: 40.6433,
    lng: -73.7824,
    name: "John F. Kennedy International Airport",
    iata: "JFK",
  },
  oporto: {
    lat: 41.2421,
    lng: -8.6784,
    name: "Francisco Sá Carneiro Airport",
    iata: "OPO",
  },
  osaka: {
    lat: 34.4339,
    lng: 135.2285,
    name: "Kansai International Airport",
    iata: "KIX",
  },
  oslo: {
    lat: 60.1932,
    lng: 11.0988,
    name: "Oslo Gardermoen Airport",
    iata: "OSL",
  },
  ottawa: {
    lat: 45.3218,
    lng: -75.6668,
    name: "Ottawa Macdonald-Cartier International Airport",
    iata: "YOW",
  },
  paris: {
    lat: 49.0084,
    lng: 2.5539,
    name: "Charles de Gaulle Airport",
    iata: "CDG",
  },
  pedro_juan_caballero: {
    lat: -22.6465,
    lng: -55.7335,
    name: "Aeropuerto Dr. Augusto Roberto Fuster",
    iata: "PJC",
  },
  pekin: {
    lat: 40.0754,
    lng: 116.5925,
    name: "Beijing Capital International Airport",
    iata: "PEK",
  },
  perth: {
    lat: -31.9338,
    lng: 115.9688,
    name: "Perth Airport",
    iata: "PER",
  },
  porto_alegre: {
    lat: -29.9961,
    lng: -51.1718,
    name: "Aeropuerto Internacional Salgado Filho",
    iata: "POA",
  },
  puerto_argentino_stanley: {
    lat: -51.6853,
    lng: -57.7788,
    name: "Port Stanley Airport",
    iata: "PSY",
  },
  puerto_rico: {
    lat: 18.4385,
    lng: -66.0022,
    name: "Luis Muñoz Marín International Airport",
    iata: "SJU",
  },
  punta_del_este: {
    lat: -34.8569,
    lng: -55.0931,
    name: "Aeropuerto Internacional de Laguna del Sauce",
    iata: "PDP",
  },
  qingdao: {
    lat: 36.2652,
    lng: 120.0827,
    name: "Qingdao Jiaodong International Airport",
    iata: "TAO",
  },
  quebec: {
    lat: 46.7915,
    lng: -71.3916,
    name: "Québec City Jean Lesage International Airport",
    iata: "YQB",
  },
  quito: {
    lat: -0.1264,
    lng: -78.3582,
    name: "Aeropuerto Internacional Mariscal Sucre",
    iata: "UIO",
  },
  reikiavik: {
    lat: 63.9859,
    lng: -22.6288,
    name: "Keflavík International Airport",
    iata: "KEF",
  },
  riad: {
    lat: 24.9575,
    lng: 46.7029,
    name: "King Khalid International Airport",
    iata: "RUH",
  },
  rio_de_janeiro: {
    lat: -22.8122,
    lng: -43.2452,
    name: "Aeropuerto Internacional de Galeão",
    iata: "GIG",
  },
  roma: {
    lat: 41.7946,
    lng: 12.2536,
    name: "Leonardo da Vinci–Fiumicino Airport",
    iata: "FCO",
  },
  saint_helier: {
    lat: 49.2081,
    lng: -2.1951,
    name: "Jersey Airport",
    iata: "JER",
  },
  san_jose: {
    lat: 9.9959,
    lng: -84.2045,
    name: "Aeropuerto Internacional Juan Santamaría",
    iata: "SJO",
  },
  san_salvador: {
    lat: 13.4435,
    lng: -89.0558,
    name: "Aeropuerto Internacional de El Salvador",
    iata: "SAL",
  },
  santa_cruz_de_la_sierra: {
    lat: -17.6433,
    lng: -63.1408,
    name: "Aeropuerto Internacional Viru Viru",
    iata: "VVI",
  },
  seattle: {
    lat: 47.4435,
    lng: -122.2965,
    name: "Seattle-Tacoma International Airport",
    iata: "SEA",
  },
  seul: {
    lat: 37.4664,
    lng: 126.4326,
    name: "Incheon International Airport",
    iata: "ICN",
  },
  sevilla: {
    lat: 37.4222,
    lng: -5.8953,
    name: "Seville Airport",
    iata: "SVQ",
  },
  sialkot: {
    lat: 32.5358,
    lng: 74.3644,
    name: "Sialkot International Airport",
    iata: "SKT",
  },
  sibiu: {
    lat: 45.7865,
    lng: 24.0888,
    name: "Sibiu International Airport",
    iata: "SBZ",
  },
  sidney: {
    lat: -33.9351,
    lng: 151.1681,
    name: "Sydney Kingsford Smith Airport",
    iata: "SYD",
  },
  singapur: {
    lat: 1.3571,
    lng: 103.9877,
    name: "Singapore Changi Airport",
    iata: "SIN",
  },
  sofia: {
    lat: 42.6917,
    lng: 23.4071,
    name: "Sofia Airport",
    iata: "SOF",
  },
  taipei: {
    lat: 25.0784,
    lng: 121.2312,
    name: "Taoyuan International Airport",
    iata: "TPE",
  },
  tampa: {
    lat: 27.9829,
    lng: -82.5367,
    name: "Tampa International Airport",
    iata: "TPA",
  },
  tel_aviv: {
    lat: 32.0016,
    lng: 34.8732,
    name: "Ben Gurion Airport",
    iata: "TLV",
  },
  tokio: {
    lat: 35.5492,
    lng: 139.7788,
    name: "Haneda Airport",
    iata: "HND",
  },
  toronto: {
    lat: 43.6766,
    lng: -79.6305,
    name: "Toronto Pearson International Airport",
    iata: "YYZ",
  },
  valencia: {
    lat: 39.4891,
    lng: -0.4811,
    name: "Valencia Airport",
    iata: "VLC",
  },
  vancouver: {
    lat: 49.1947,
    lng: -123.1793,
    name: "Vancouver International Airport",
    iata: "YVR",
  },
  varsovia: {
    lat: 52.1706,
    lng: 20.9749,
    name: "Warsaw Chopin Airport",
    iata: "WAW",
  },
  viena: {
    lat: 48.1186,
    lng: 16.5646,
    name: "Vienna International Airport",
    iata: "VIE",
  },
  vilna: {
    lat: 54.6415,
    lng: 25.2758,
    name: "Vilnius Airport",
    iata: "VNO",
  },
  wellington: {
    lat: -41.3262,
    lng: 174.8055,
    name: "Wellington International Airport",
    iata: "WLG",
  },
  winnipeg: {
    lat: 49.9022,
    lng: -97.2343,
    name: "Winnipeg James Armstrong Richardson International Airport",
    iata: "YWG",
  },
  wuhan: {
    lat: 30.7712,
    lng: 114.2084,
    name: "Wuhan Tianhe International Airport",
    iata: "WUH",
  },
  xiamen: {
    lat: 24.5388,
    lng: 118.1306,
    name: "Xiamen Gaoqi International Airport",
    iata: "XMN",
  },
  zagreb: {
    lat: 45.7423,
    lng: 16.0645,
    name: "Franjo Tuđman Airport Zagreb",
    iata: "ZAG",
  },
  zaragoza: {
    lat: 41.6644,
    lng: -1.0422,
    name: "Zaragoza Airport",
    iata: "ZAZ",
  },
  zurich: {
    lat: 47.4526,
    lng: 8.5604,
    name: "Zurich Airport",
    iata: "ZRH",
  },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca las coordenadas del aeropuerto por el nombre normalizado del origen.
 * Intenta coincidencia exacta primero, luego parcial.
 */
export function getAirportByOrigin(
  originNormalized: string,
): AirportCoords | null {
  if (!originNormalized) return null;

  const key = normalizeText(originNormalized);
  const aliases: Record<string, string> = {
    "sudafrica johannesburgo": "sudafrica",
    "south africa johannesburg": "sudafrica",
    johannesburgo: "johannesburgo",
    johannesburg: "johannesburg",
  };

  if (aliases[key] && airportCoordinates[aliases[key]]) {
    return airportCoordinates[aliases[key]];
  }

  // Coincidencia exacta
  if (airportCoordinates[key]) {
    return airportCoordinates[key];
  }

  // Coincidencia parcial: si el origin contiene el nombre del aeropuerto o viceversa
  for (const [airportKey, coords] of Object.entries(airportCoordinates)) {
    const normalizedAirportKey = normalizeText(airportKey);
    if (
      key.includes(normalizedAirportKey) ||
      normalizedAirportKey.includes(key)
    ) {
      return coords;
    }
  }

  return null;
}

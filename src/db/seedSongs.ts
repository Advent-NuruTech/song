import { db } from "./database";

export async function seedSongs() {
  const now = Date.now();

  const sampleSongs = [
 
    {
  id: "LUO_001",
  hymnNumber: 1,
  title: "Nyasachwa Man Malo",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nyasachwa man malo, Wuon teko duto",
      "Onge teko moro mak tekone adier;",
      "Onge ng`ato moro miporo go Nyasaye.",
      "En Ruoth ruodhi, be Nyasach nyiseche."
    ],
    [
      "Hera mar Nyasachwa, Hera adieri",
      "En nooro Yesu nikech noherowa;",
      "Ne Yesu othonwa mondo kik walal ngang`,",
      "To wanahere kak` owinjore."
    ],
    [
      "Ng`wono mar Nyasachwa, ng`wono mochwere;",
      "Oloso ji duto, okonyogi pile;",
      "Kik wacha Nyasachwa, to wamiye duong` chuth,",
      "En Wuon ng`wono, gi hera, gi teko."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_002",
  hymnNumber: 2,
  title: "Wapaki Nyasaye",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wapaki, Nyasaye,",
      "In miherowa ngang`!",
      "Nioro Wuodi mond` othonwa e yath."
    ],
    [
      "Wapaki, Nyasaye,",
      "nikech Roho Maler.",
      "Osefwenyonwa hera mar Jawarwa."
    ],
    [
      "Pak duto obed ni",
      "Nyarombo Nyasaye,",
      "Ma noting`o kethwa, rembe nochwernwa."
    ],
    [
      "Pak duto obed ni,",
      "Nyasaye, Wuon ng`wono,",
      "Ma noresowa kendo oritowa."
    ],
    [
      "Chiew chunywa duto,",
      "pong`wa gi herani;",
      "Mach moa e polo omi chunywa liet."
    ]
  ]),
  chorus: JSON.stringify([
    "Alleluya! Wanapaki;",
    "Alleluya! Amin.",
    "Alleluya! Wanapaki;",
    "Igwedhwa koro."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_003",
  hymnNumber: 3,
  title: "Duong' Obed Ni Wuonwa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Duong` obed ni Wuonwa kuom gi motimo;",
      "Nikech nohero piny, mochiwo Wuode",
      "Ma notho e yath Mondo oluok richo,",
      "Mondo ng`a moyie kuome oyud ngima."
    ],
    [
      "Ruoth Yesu noseng`iewowa gi rembe,",
      "Nyasaye osingo ni jo moyie kuome,",
      "Kinde ma giruako Yesu e chunygi",
      "E ma enowenigie kethgi duto."
    ],
    [
      "Osetimo tichne madongo ni piny,",
      "Wamor moloyo kuom puonj Yesu Ruodhwa;",
      "Wanamor moloyo gi chunywa duto,",
      "Ka waneno wang` Yesu ma Jawarwa."
    ]
  ]),
  chorus: JSON.stringify([
    "Wapak Ruoth, wapak Ruoth,",
    "Piny mond` owinj dwonde;",
    "Wapak Ruoth, wapak Ruoth,",
    "Mondo ji duto luor;",
    "Biuru ni Wuonwa kuom Yesu Wuode,",
    "Mondo wapake kuom gik mosetimo."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_004",
  hymnNumber: 4,
  title: "Nying Yesu Mondo Yudi Pak",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nying Yesu mondo yudi pak,",
      "Ji mondo gidende;",
      "Malaika me polo ku,",
      "Miuru Ruodhu duong`."
    ],
    [
      "Miuru Ruoth duong` e chunyu,",
      "Geneuru kende;",
      "Ting` nyinge malo kuom jopiny,",
      "Miuru Ruodhu duong`."
    ],
    [
      "Un jo moketho, paruru kaka nogur Yesu;",
      "Nowaru gi rembe maler,",
      "Miuru Ruodhu duong`."
    ],
    [
      "Un jo mong`eyo ng`wono Ruoth,",
      "Un ma koth Israel,",
      "Hereuru, pake gi wer,",
      "Miuru Ruodhu duong`."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_005",
  hymnNumber: 5,
  title: "To Pakuru Ruoth",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "To pakuru Ruoth me polo malo;",
      "Weruru maber: ohero adier;",
      "En lwanda mageno, Makonyo duto;",
      "Mosiko mochwere, mipako chutho."
    ],
    [
      "To paruru piny, en hono maduong`,",
      "Gi nam, kodi yien, gi gode kod lum;",
      "Wawuoro ngang` rieko maloso kama;",
      "wapako Nyasachwa manyisowa ma."
    ],
    [
      "Gik moko me piny onyisowa ma,",
      "Nyasachwa oduong`, oler adiera;",
      "Oherowa duto gotieno gokinyi;",
      "Omiyowa ngima, orito mang`won."
    ],
    [
      "Jo malaika gipako mamor,",
      "Jatelo maduong` mohero jopiny;",
      "To wan jo mireso wadende maber,",
      "Wapaki adiera kama nyaka chieng`."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_006",
  hymnNumber: 6,
  title: "Wuonwa Wabironi",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wuonwa, wabironi, konyruok waongego",
      "In e kar konyruokwa, wasayoi;",
      "Kwapogore kodi, to waneno chandruok;",
      "Wuonwa, mond` ihowa, ka ma wantie."
    ],
    [
      "Ritwa kuom wasikwa, ritwa e chandruokwa",
      "Warwa e masiche, kwaluongoi.",
      "Chunywa ochandore, wadwaro tekoni",
      "Wakwayoi chutho, miwa teko."
    ],
    [
      "Ng`wononi imiwa, wabed magi chutho,",
      "Chunywa mond` iriti, ka wan e wuoth.",
      "Telnwa, wakwayoi, nyaka watiek wuodhwa",
      "Nyaka wadonj polo mar dak kodi"
    ]
  ]),
  chorus: JSON.stringify([
    "Wuonwa wabironi, wan to wanyap",
    "Kik iwewa kendwa Wuonwa, winjwa."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_007",
  hymnNumber: 7,
  title: "Nyasaye Indi Nikonyowa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nyasaye indi nikonyowa,",
      "In tekowa mak rum;",
      "Waluor ang`o t`iritowa",
      "Ma nyaka piny ogik."
    ],
    [
      "Chon ji maler nogenoi.",
      "Niritogi mang`won;",
      "To ng`wononi mak lokore",
      "Omiyo wageni."
    ],
    [
      "Ka ne pok ichweyo pinyni",
      "Ne gi moro onge;",
      "To ne Intie Nyasaye maler,",
      "Intie ma nyaka chieng`."
    ],
    [
      "To gik moko duto mag piny",
      "Gikadho akadha;",
      "To gir polo ma ok lal ngang`,",
      "Gir polo wanayier."
    ],
    [
      "Nyasaye indi nikonyowa,",
      "In tekowa mak rum;",
      "Walu bang`i pile pile,",
      "Nyasaye ma Jakonywa."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_008",
  hymnNumber: 8,
  title: "Winji Yuakna Inyisa Ng'wononi",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Winji yuakna, inyisa ng`wononi,",
      "In Jakonya, bina;",
      "Chunya motur ogombo bironi,",
      "In Jakonya, bina."
    ],
    [
      "Aonge kara, kata kar konyruok.",
      "In Jakonya, bina;",
      "Wang`i mang`uon miya bedo gi ler,",
      "In Jakonya, bina."
    ],
    [
      "An kenda ka, to tienda ol e yo,",
      "In Jakonya, bina;",
      "Ang`iyoi, mond` ayud mor kuomi,",
      "In Jakonya, bina."
    ],
    [
      "In ok nidag jalo ma chunye tur,",
      "In Jakonya, bina;",
      "Winj alamna, Kendo iwinj yuakna,",
      "In Jakonya, bina."
    ]
  ]),
  chorus: JSON.stringify([
    "Asebayo mabor e piny malich,",
    "Asebayo mabor kodi; kawa koro,",
    "Idwoka e kundi, In Jakonya bina."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_009",
  hymnNumber: 9,
  title: "Jachwechna Gi Ruodha",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Jachwechna gi Ruodha, Gigo ma an godo;",
      "Nayudo duto e lueti, Gweth duto a kuomi;",
      "Nayudo duto e lweti, Gweth duto a kuomi."
    ],
    [
      "Nikech an chwech mari, Angima kuomi Ruoth;",
      "An kaparo kak` ikonya Chunya opakoi;",
      "An kaparo Kak` ikonya Chunya opakoi."
    ],
    [
      "Ruoth, damii ang`o? Duto ne mari chon;",
      "Achiwoni chunya chutho kata korach kama.",
      "Achiwoni chunya chutho kata korach kama."
    ],
    [
      "Pong` chunya gi hera, Imiya tekoni;",
      "Weche, paro, gi ngimana, Obed mari chutho.",
      "Weche, paro, gi ngimana, Obed mari chutho."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_010",
  hymnNumber: 10,
  title: "Kristo In Wuon Ng'wono Duto",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Kristo, In Wuon ng`wono duto,",
      "Puonj chunya mond` opaki;",
      "Gwethni ma ayudo pile",
      "Miyo chunya mor kuomi.",
      "Puonja heroi adieri,",
      "Mond` aluwi kwonde te;",
      "Muchi mondo dak e chunya,",
      "Miya genoi pile."
    ],
    [
      "An apaki, In Jakonya,",
      "In mitelona pile;",
      "An kaluwo bang`i pile,",
      "Nachopi thurwa gi kuwe.",
      "Yandi Yesu to nodwara",
      "Ka nabayo yo marach;",
      "Rembe nochwer mond` owara,",
      "Noresa e kethona."
    ],
    [
      "An to, an jagope chutho",
      "Kuom ng`wono motimona;",
      "Hera mari mond` otweya",
      "Abed ng`ati chutho, Ruoth.",
      "Piny to kik oywaya kendo,",
      "Asik kuomi, yaye Jakony;",
      "Achiwoni chunya koro,",
      "Obed mari nyaka chieng`."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_011",
  hymnNumber: 11,
  title: "Yesu Ise Singo",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu isesingo, kata ji manok chokore e nyingi,",
      "inibed kodgi; Wan wageno wachni,",
      "ka walemo ka; Yesu, bi igwedhwa,",
      "fwenyrinwa koro."
    ],
    [
      "Nisebedo kodwa ndalo mokadho;",
      "To wadwari kodwa nyaka piny ogik;",
      "Binwa, yaye Jawarwa, nyiswa ng`wononi;",
      "Winjwa kendo yienwa, gwedhwa kwalemo."
    ],
    [
      "Yesu, konywa mondo wapaki maber;",
      "Bedi Kuom alamwa ma walami go.",
      "Mond` itegnwa yiewa, kijiwo chunywa;",
      "Pong` chunywa gi hera, menynwa wang` yorwa."
    ]
  ]),
  chorus: JSON.stringify([
    "Yesu, bi igwedhwa,",
    "ka waling` kae;",
    "Yesu, bi igwedhwa,",
    "bed butwa pile."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_012",
  hymnNumber: 12,
  title: "Ji Duto Mondo Wer Wendni",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ji duto mondo wer wendni,",
      "Denduru nying Yesu Ruodhwa!",
      "Nyisuru duong` Nyasaye Ruodhwa,",
      "Denduru nying Yesu Ruodhwa!"
    ],
    [
      "Otieko luorowa duto;",
      "Denduru nying Yesu Ruodhwa!",
      "Oketho teko mar Satan,",
      "Denduru nying Yesu Ruodhwa."
    ],
    [
      "Oruako Jo malokrene;",
      "Denduru nying Yesu Ruodhwa!",
      "Rembe oluoko jo moyie;",
      "Denduru nying Yesu Ruodhwa!"
    ]
  ]),
  chorus: JSON.stringify([
    "Denduru nyinge, denduru nyinge,",
    "Nying Ruodhwa obedi gi pak.",
    "Denduru nyinge, denduru nyinge,",
    "Denduru nyinge Yesu Ruodhwa!"
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_013",
  hymnNumber: 13,
  title: "Paki Nyasaye Mogwedhwa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Paki Nyasaye mogwedhowa.",
      "Ji duto pake e piny ka;",
      "Paki Yesu, Malaika,",
      "Paki Jakony, Muya Maler.",
      "Amin."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_014",
  hymnNumber: 14,
  title: "Nyasacha Mond' Awuoth Kodi",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nyasacha, mond` awuoth kodi,",
      "kaka Enok nowuotho chon;",
      "Mak lueta mond kik aluor,",
      "Mond` ayud twak mamit kodi;",
      "Kata ok ane yo maber,",
      "To Yesu mond` awuoth kodi."
    ],
    [
      "Ok dak awuothi kenda ngang`;",
      "Yamo malich kudho e piny;",
      "Obadho ng`eny madi maka;",
      "Wasigu ng`eny malworoa;",
      "In minyalo kweyo yamo,",
      "Ruodha, ni mond` awuoth kodi."
    ],
    [
      "In ka imako lueta, Ruoth,",
      "nakwan gik mag piny ka nono;",
      "Namak wuodha katimo chir,",
      "Nadhi nyime nyak` achopi",
      "E dalani, Zayun maler;",
      "Jawarwa, mond` awuoth kodi."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_015",
  hymnNumber: 15,
  title: "Wuo Gi Chunya Ruoth Yesu",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wuo gi chunya, Ruoth Yesu, Wuona gi dwol mamuol,",
      "Kiwachona gi ng`wono, \"Ok idong` kendi ngang`; \"",
      "Yaw chunya mond` awinji, Awinj dwondi piyo;",
      "Mi chunya mond` opaki, Kamor kuomi chutho."
    ],
    [
      "Wuo gi nyithindi pile, Tergi e yo maler;",
      "Pong`gi gi mor gi ilo, Puonjgi rito galam;",
      "Mondo giwalni chunygi, Kod ngimagi duto,",
      "Ru biro mar pinyruodhi, Mondo waneni, Ruoth."
    ],
    [
      "Wuo koda kaka chon cha Niwuoyo gi jogi;",
      "Nyisa gino Midwaro mondo atini, Ruoth;",
      "Ni mondo amak chikni, Kendo amiyi duong`;",
      "E ngimana gi wuodha mond` apaki pile."
    ]
  ]),
  chorus: JSON.stringify([
    "Wuona gi dwol mamuol chuth,",
    "kinyisa herani; Ni mondo alo richo",
    "Kawauotho kuom Roho;",
    "Wuo koda ndalo duto,",
    "Wuona gi dwol mamuol;",
    "Ageno singruok mari:",
    "\"Ok idong` kendi ngang`.\""
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_016",
  hymnNumber: 16,
  title: "Ruoth Maler Adwari Pile",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ruoth maler, adwari pile! An ayom,",
      "An ng`a marach; Mak lueta kitaya pile,",
      "Tekona nayud kuomi."
    ],
    [
      "Chuny mamuol mondo imiya;",
      "Richo osekethoa;",
      "Puonja mondo ang`e yomna,",
      "An akwayi tekoni."
    ],
    [
      "Ok naluor kitaya pile;",
      "To kenda nagora piny;",
      "Wuothi koda, yaye Jakonya,",
      "In lerna, In ngimana."
    ],
    [
      "Kata gi manade biro,",
      "Kata mor, kata kuyo;",
      "Chunya pod otwere kuomi,",
      "In Jakonya saa duto."
    ]
  ]),
  chorus: JSON.stringify([
    "Saa duto, saa duto,",
    "Ruoth maler adwari pile;",
    "Saa duto, saa duto,",
    "Ruodha, rita saa duto."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_017",
  hymnNumber: 17,
  title: "Kristo Ok An Ni Mond' Oyud Duong'",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Kristo, ok an, ni mond` oyud duong`;",
      "pile. Kristo, ok an, onego ji winje;",
      "Kristo, ok an, kite one e ringra;",
      "Kristo, ok an, wechene di chungi."
    ],
    [
      "Kristo, ok an, mahoyo chuny makuyo;",
      "Kristo, ok an, manyal golo pi wang`;",
      "Kristo, ok an, makonyowa e chandruok;",
      "Kristo, ok an, magolo luorowa."
    ],
    [
      "Kristo kende, kik agomb ng`ato moro;",
      "Kristo kende, to kik chunya ting`re;",
      "Kristo kende, kik apakra gi berna;",
      "Kristo, kende ni mond` agur ringra."
    ],
    [
      "Kristo, ok an, mageno e tich duto;",
      "Kristo, ok an, ni ngimana pile;",
      "Kristo, ok an, ni morna gi kuwe mara;",
      "Kristo, ok an, pile be nyaka chieng`."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_018",
  hymnNumber: 18,
  title: "Kama Yesu Chon Notho E Yath",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Kama Yesu chon notho e yath,",
      "Rembe nochwer ni jomaricho;",
      "Kanyo noluoko chunya mapoth;",
      "Pakuru Yesu."
    ],
    [
      "Nosewarowa e kethruok te,",
      "Koro Yesu odak e chunya;",
      "Yesu noruaka gi herane;",
      "Pakuru Yesu."
    ],
    [
      "Amor niwira oseluoka,",
      "E thidhiya ma nochwer ni wan;",
      "Yesu owara, oritoa;",
      "Pakuru Yesu."
    ],
    [
      "Biuru ni sokoni mamit;",
      "Miuru Yesu chunyu koro;",
      "Mondo ubedi maler chutho,",
      "Pakuru Yesu."
    ]
  ]),
  chorus: JSON.stringify([
    "Pakuru Yesu, Pakuru Yesu;",
    "Kanyo noluoko chunya mapoth,",
    "Pakuru Yesu."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_019",
  hymnNumber: 19,
  title: "Yesu Mond' Itama Pile",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu, mond` itawa pile, wadwaro mond` iritwa;",
      "Gi chiembi mamit yieng` chunywa, Yienwa bedo e kwedhi,",
      "Yesu Kristo, Yesu Kristo, Iseng`iewowa, wan jogi.",
      "Yesu Kristo, Yesu Kristo, Iseng`iewowa, wan jogi."
    ],
    [
      "Wan jogi, bedi Osiepwa, Bed Jatendwa e wang`yo;",
      "Rit kwedhi, kik richo lowa, Manywa kwabayo e yo;",
      "Yesu Kristo, Yesu Kristo, Winjwa ka walamoi.",
      "Yesu Kristo, Yesu Kristo, Winjwa ka walamoi."
    ],
    [
      "Iseyie kaka niruakwa, kata wan jo moketho;",
      "In ing`won mondo iwenwa, luokwa, pwodhwa gi rembi;",
      "Yesu Kristo, Yesu Kristo, wanalokre iri, Ruoth.",
      "Yesu Kristo, Yesu Kristo, wanalokre iri, Ruoth."
    ],
    [
      "Konywa mondo watim maber, Mi watim gi midwaro;",
      "Ruoth maler, Jawarwa kende, Pong` chunywa gi herani.",
      "Yesu Kristo, Yesu Kristo Mond` iherwa mosiko.",
      "Yesu Kristo, Yesu Kristo Mond` iherwa mosiko."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_020",
  hymnNumber: 20,
  title: "Nyasachwa En E Lwandawa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nyasachwa En e Lwandawa,",
      "En Lwandawa mogeng`owa;",
      "Jakony e chandruokwa duto,",
      "Mobedo machiegni chutho."
    ],
    [
      "Kata wach bet nade kodwa,",
      "En Lwandawa mogeng`owa;",
      "Wang`eyo kaka En Jakony,",
      "Mobedo machiegni chutho."
    ],
    [
      "Gotieno kata godiechieng`,",
      "En Lwandawa mogeng`owa;",
      "Kamano ok wanaluor ngang`,",
      "Nikech En machiegni kodwa."
    ],
    [
      "Nyasachwa e makonyowa,",
      "En Lwandawa mogeng`owa;",
      "Ndalo duto Entie kodwa,",
      "Obedo machiegni chutho."
    ]
  ]),
  chorus: JSON.stringify([
    "En Lwandawa e chandruok duto,",
    "En tipo ka ma wayueyo;",
    "Jatelo, En motelonwa;",
    "Kar pondo e ndalo chandruok."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_021",
  hymnNumber: 21,
  title: "Adwaro Ket Kod Yesu",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Adwaro Ket kod Yesu; Ruodha mond` odag koda,",
      "Pong` chunya gi herane, Abed mang`won kaka En.",
      "Adwaro ket kod Yesu kawuotho e pinyni ka;",
      "Oket Muche e chunya, Ruodha mond` odag koda."
    ],
    [
      "Kowinjo yuak mar winyo, kendo ritogi mang`won,",
      "Ang`eyo nowinj yuakna, Ong`eyo chandruokna te;",
      "Enochikna ngimana, Enowena kethona;",
      "Chunya nobedi maler ka Ruodha odak koda."
    ],
    [
      "Aket kode kuom lemo, Amed chal kode pile;",
      "Kuwe mare opong` chunya kasiko bute pile;",
      "Norita kuom ng`wonone, Herane nolo chunya;",
      "Nabet gi geno chutho ka Ruodha odak koda."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_022",
  hymnNumber: 22,
  title: "Kik Ibarna Yaye Jakonya",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Kik ibarna, yaye Jakonya, Winji yuak mara;",
      "In Kiluongo jo mamagi, Mond` iluonga be."
    ],
    [
      "An kaparo ng`wono mari chunya yudo kuwe;",
      "Ka agoni chonga piny ka, Jawarna, Konya."
    ],
    [
      "An ageno nyingi kende, Adwaro neni;",
      "Changi chunya moseketho, Wara gi rembi."
    ],
    [
      "Miwaso ohewa kodi, To agombi nga`ng;",
      "Ere ng`a maromo kodi E piny gi polo?"
    ]
  ]),
  chorus: JSON.stringify([
    "Yesu, Yesu, Winji yuak mara;",
    "In Kiluongo jo mamagi, mond` iluonga be."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_023",
  hymnNumber: 23,
  title: "Aheri Aheri Aheri Ruodha",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Aheri, aheri, aheri Ruodha;",
      "Aheri, Jawarna, bende Nyasacha;",
      "Aheri, aheri, kendo ing`eyo;",
      "To kaka aheri, timbena nohul."
    ],
    [
      "Amor ka aparo mwandu moikna;",
      "To morna ok norum kasomo wachni;",
      "To agombo chopo e polo malo,",
      "Mond` abed gi Yesu gi malaika."
    ],
    [
      "Ruoth Yesu, Jawarwa, In e ngimana;",
      "In morna, warruokna, In kar yueyona;",
      "Napak nyingi kendo nawer herani;",
      "Ng`wononi nonyisre kuom kit ngimana."
    ],
    [
      "Onge ng`a machalo kod Yesu Jawar;",
      "En Ruodha mohera, napake maber;",
      "Napake, nadende kod wende mag chuny;",
      "En kende magene, morna gi wenda."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_024",
  hymnNumber: 24,
  title: "Jawarna To Ni Yesu",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Jawarna to ni Yesu, En morna gi wenda;",
      "Ohoyoa gi wachne, ka chunya okuyo."
    ],
    [
      "Yesu ni ng`a mageno, ndalo duto Entie;",
      "Ka piny otimo mudho, Lerne omenyoa."
    ],
    [
      "Agenoi Jawarna, Osiep mageno chuth;",
      "Yandi ahero bayo, koro abet buti."
    ],
    [
      "In e wenda gi morna, E pinyni mar chandruok;",
      "In e wenda gi morna, kadonjo e polo."
    ]
  ]),
  chorus: JSON.stringify([
    "Jawarna to ni Yesu; Anapake kawer;",
    "Osiepna moro onge, moheroa ka En."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_025",
  hymnNumber: 25,
  title: "In E Ngimana Mochwere",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "In e ngimana mochwere moloyo duto me piny;",
      "E wuodha duto me piny ka, Jawar yie awuoth kodi."
    ],
    [
      "Ok alem ne mor mar pinyni, ok alem mond` ayud dwong`;",
      "Na ti gi mor kat e chandruok, Yie mondo awuoth kodi."
    ],
    [
      "Telna e pinyni mar mudho ting`a mondo alo piny;",
      "Eka mondo adonj kodi e ngima ma ok norum."
    ]
  ]),
  chorus: JSON.stringify([
    "Kodi Ruoth, kodi Ruoth,",
    "Kodi Ruoth, kodi Ruoth;",
    "E wuodha duto me piny ka,",
    "Jawar yie awuoth kodi."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_026",
  hymnNumber: 26,
  title: "Ji Duto Te Mondo Giwer",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ji duto te mondo giwer ka gipako Jawar, Ka gipako Jawar;",
      "Gipak duong` mar Ruoth Nyasachwa kod ng`uonone maduong`."
    ],
    [
      "Ruodha maduong` gi Nyasacha konya mondo ahul;",
      "Konya mondo ahul Duong` mar Nying Ruoth gi Jawarna E kuonde duto te."
    ],
    [
      "Yesu en nying makelo mor, Ogolo kuyowa;",
      "Ogolo kuyowa En wer mamit ni jaricho En ngimana kod kuwe."
    ],
    [
      "Oketho teko mar richo Ogonyo jomotwe, ogonyo jomotwe;",
      "Rembe nyalo luoko richo Rembeno nochwerna."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_027",
  hymnNumber: 27,
  title: "To En Ng'a Man E Kund Dhok",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "To en ng`a man e kund dhok, ma jokwath olamo cha?"
    ],
    [
      "To en ng`a e thim kucha, ma Satan ne otemo?"
    ],
    [
      "To en ng`a mayuak e liel, kama Lazaro onindoe?"
    ],
    [
      "To en ng`a ma ji pako, nikech weche mag ng`wono?"
    ],
    [
      "To en ng`a mathiedho ji, ma noyawo wang` muofuni?"
    ],
    [
      "To en ng`a mochier maber, ma noloyo tho adier?"
    ],
    [
      "To en ng`a moherowa, ma nogolo richowa?"
    ],
    [
      "To en ng`ano mano gur, ma nochandore malit?"
    ]
  ]),
  chorus: JSON.stringify([
    "En e Ruoth! To en Jawarwa En e Ruoth!",
    "Moloyo duto Wanagone chongwa piny;",
    "Pakeuru Yesu Ruoth."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_028",
  hymnNumber: 28,
  title: "Nying Mamit E Piny Gi Polo",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nying mamit e piny gi polo, Nying moloyo nying duto;",
      "Nyingno ma Nyasaye nochiwone Wuode mohero chuth."
    ],
    [
      "Nying mamiyo chunya yueyo, Anapak nyingno chutho;",
      "Anahul nyingno e nyim ji, Nying mamitna moloyo."
    ],
    [
      "Anawer kapako nyingno, gi hera mowarowa;",
      "Anapake ndalo duto, Nying moloyo nying duto."
    ]
  ]),
  chorus: JSON.stringify([
    "Nying maber moloyo, Nying Jawarwa Yesu;",
    "Nying ma noa e polo kuom wuoro;",
    "Malaika maler ema nokelogo,",
    "Nying` mamit maber mar Yesu."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_029",
  hymnNumber: 29,
  title: "Yesu Jakwath Moheroa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu Jakwath moheroa, Okecha ndalo duto;",
      "An ok achand gimoro ka, Owuotho koda nyaka chieng`."
    ],
    [
      "Naweyo yo nalal marach, To En Owuon nodwara;",
      "Noting`a mos e goke to, Nomor kotera dalane."
    ],
    [
      "Kar lek mamit, kar pi mang`ich, Otera kanyo pile;",
      "Okwayoa, oritoa, Yesu Jakwath mang`won adier."
    ],
    [
      "Ka tho nitie adagi luor ka Yesu bedo koda;",
      "Ohoyoa, Osiroa, En bende e motelona."
    ],
    [
      "Opedho mesa nyima ka, Otimo sap misango;",
      "Omiya mor gi cham maler, Remb Yesu miyo chunya yom."
    ],
    [
      "Kendo kama ti onge nyaka chieng`, Igwedha ndalo duto;",
      "Jakwath maber adendi ma, E odi ndalo duto ka."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_030",
  hymnNumber: 30,
  title: "Apako Hera Nyasaye",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Apako hera Nyasaye Wuoro mochiwona Rohone;",
      "Maloko kuyona bedo mor koweyona richona;",
      "Kata mudho olil manade, osesingo nobed buta",
      "Omiya ler marieny e mudho, Kendo ber e kar richo."
    ],
    [
      "Awero hera mar Jawarna manotho e yath ni an,",
      "Ni mondo kobedo e chunya nogonya kuom twech duto;",
      "Obiro waro jomaricho obiro konyo chuny mool,",
      "Omiya mor e saa mar kuyo, kendo ber e kar richo."
    ],
    [
      "Apako ber mar wach injili monyisa weche mamit;",
      "Nomiya mor mar nyiso lerna, ka manade ma antie,",
      "Orwaka gi law mar herane ka chunya opong` gi luoro;",
      "Omiya ler marieny e mudho, kendo ber e kar richo."
    ]
  ]),
  chorus: JSON.stringify([
    "Omiya mor - - - e saa mar kuyo",
    "Ogolona luoro mar tho",
    "Omiya ler marieny e mudho",
    "Kendo ber e kar richo."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_031",
  hymnNumber: 31,
  title: "Duto Paki Ruodh Polo",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Duto paki, Ruodh Polo, Dhano, bende gik moko;",
      "Nichweyogi ni mondo gipaki mowinjore;",
      "Jo maler e pinje te, Duto paki; wan bende."
    ],
    [
      "Duto paki otieno, sulwe be marieny malo;",
      "Chieng` oporo duong`ni, to lietne nyiso herani;",
      "Wuok chieng` nyaka podhone, Duto paki; wan bende."
    ],
    [
      "Duto paki e polo, Seraf kod jokerubi;",
      "Dwond asele, thum Nyasaye, Dwonde ji makulore;",
      "Wendgi ok ogik ngang`, Paki pile; wan bende."
    ],
    [
      "Duto, malo kata piny, Paki paki mak gi ri;",
      "Chwiri, oro, dongo cham, Dhano kende e mobam;",
      "Winy, gibuya, gik mamol, Dak wapaki kaka gin."
    ],
    [
      "Dhi imany rombe molal, nyisgi kaka Wuod Nyasaye;",
      "Nosetho ni keth mag piny, puonjgi mos kuom Piny Manyien;",
      "Migi konywa pako Ruoth, Nyaka chieng` ma nyaka chieng`."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_032",
  hymnNumber: 32,
  title: "Koro Ka Wachokore",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Koro ka wachokore, Ni mondo wahing Yesu,",
      "Wanapar Yesu Kristo, Wanayiee gi chunywa;",
      "Koro wahingo Yesu, Ma notho e Kalwari."
    ],
    [
      "Ka wachamo mkate ni, Kawamadho kikombe ni,",
      "Wanahing ringre Jawar Ma nogur e yath ni wan;",
      "Wanahing remb Ruoth Yesu ma nochwer e Kalwari."
    ],
    [
      "Nyasachwa, ornwa Muchi, mondo donji e chunywa;",
      "Koro wahingo Wuodi, kaka En notho niji,",
      "Kaka rembe nochwernwa, Ka notho e Kalwari."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_033",
  hymnNumber: 33,
  title: "Wuonwa Gonywa Gi Gweth Mari",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wuonwa, gonywa gi gweth mari,",
      "Pong` chunywa gi mor gi kuwe;",
      "Miwa duto herruok mari, kethowa bende iwe.",
      "Miwa geno, miwa geno, Ka wawuotho e pinyni."
    ],
    [
      "Wachiwo pak gi mor bende, Kuom weche mioronwa;",
      "Ka wamako chikni chutho, Wanabed e herani.",
      "Konywa timo, konywa timo, gi kinda nyaka ibi."
    ],
    [
      "Ka wawuotho e piny kae, ber wati ni In kende;",
      "Ber wati ni In kende; konywa ka walu e yori,",
      "Kik wajogi, kik wawe. Bedi kodwa, bedi kodwa,",
      "Ka wawuok, bende kwake."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_034",
  hymnNumber: 34,
  title: "Nyasaye Wachungo Ka Wawer Ka",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nyasaye, wachungo ka wawer kae,",
      "Ni mondo igwedhwa ka pok wadhi;",
      "Wadwaro lami, ka wan nyimi ka,",
      "Ka wagochongwa lamoi gi kuwe."
    ],
    [
      "Miwa kuwe mari ka wadhi koro,",
      "Chako gi tieko inibed kodwa,",
      "Dhowa moselami e odi ni,",
      "Kik gol weche makelonwa wich kuot."
    ],
    [
      "Miwa kuwe mari ka wan e pinyni,",
      "Kata wakuyo kata chunywa lit;",
      "In kende In gi wach mahoyowa;",
      "Nyasaye wageni, wan duto man ka."
    ],
    [
      "Koro Nyasaye waparoi tinde,",
      "Ka koro wasewinjo wach mamit;",
      "Konywa ni mondo wamak wecheni;",
      "Kik Satan mawa kata wach achiel."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_035",
  hymnNumber: 35,
  title: "Paruru Nying Yesu Koro",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Paruru nying Yesu koro, un jopiny machandore;",
      "Enomiu doko mamor, paruru nyinge koro."
    ],
    [
      "Paruru nying Yesu pile, Enogeng`nu maricho;",
      "Ka temruok odwaro lou, Lamuru gi nyingeno."
    ],
    [
      "Paruru nying Yesu koro, E manyalo konyou;",
      "Ka orwakowa gi ng`uono, Paruru nying Yesu Ruoth."
    ],
    [
      "En Ruodh ruodhi wanadende, ka wagone chongwa piny;",
      "Kucha e pinyruoth mar polo, Ka wuodhwa me piny rumo."
    ]
  ]),
  chorus: JSON.stringify([
    "Nyinge ber moloyo, Nyingeno wageno ka;",
    "Nyinge ber moloyo (Nyinge ber, ober moloyo)",
    "Nyingeno wageno ka."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_036",
  hymnNumber: 36,
  title: "Ruoth Yesu Nithona Koro",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ruoth Yesu, nithona, koro aheri;",
      "Kuom tekoni nawe richona duto;",
      "In ma Jawar mang`won, rembi nochwerna;",
      "Koro, Yesu Ruodha, aheri adier."
    ],
    [
      "Aheri nikech nihera mokwongo;",
      "Niting`o richona e yadh Kalwari;",
      "Nichandori malit nikech richona;",
      "Koro, Yesu Ruodha, aheri adier."
    ],
    [
      "Anaheri pile nyaka chieng` thona;",
      "Anapaki pile ka pod angima;",
      "Ka ngimana norum, to pod nawachni,",
      "Koro Yesu Ruodha, aheri adier."
    ],
    [
      "Eka kwadak kodi e dala Nyasaye,",
      "E piny Ruoth manyienno nadendi pile.",
      "Kosidhna osimbo napaki kawer;",
      "Koro, Yesu Ruodha, aheri adier."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_037",
  hymnNumber: 37,
  title: "Yesu In Miheroa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu, In miheroa, Yiena mond` aring iri;",
      "Yesu ruaka, In mang`won, Pod aonge teko ka.",
      "To masira loyoa, Piny otera kumabor;",
      "Ok aneno yo maber, To ahombi konya ka."
    ],
    [
      "Kristo, In miromona, In mimiya hap Nyasaye,",
      "In michango jo matuo, In mihero jo motho;",
      "Yesu In maler adier, An arach moloyo ji;",
      "Richo e mokethoa, Buchi e moloyoa."
    ],
    [
      "Yo machielo ok adwar, In Iwuon e wang` yora,",
      "Kik idaga, kik iling`, sira, hoya, ng`wonna.",
      "Ee, Jakony, agenoi, Tekoni ichiwona;",
      "Chungi buta nyaka chieng`; Demba, rita, kik alal."
    ],
    [
      "Yesu, miya ng`wononi, Golna richo duto te,",
      "Hombo to ahomboi; Luoka, guda,",
      "Konya chuth, Bedi koda nyaka chieng`,",
      "Nyisa tich michikoa; Dag e chunya, kik ia,",
      "Ndalo duto nyaka chieng`"
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_038",
  hymnNumber: 38,
  title: "Anawer Hera Yesu",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Anawer hera Yesu, Anawer koheroa,",
      "Noweyo polo malo, Nosetho e Kalwari."
    ],
    [
      "Anawer ng`wono Yesu, Anawer kong`wonona;",
      "Enowena kethona, Enoyie ni an mare."
    ],
    [
      "Yesu, donji e chunya, In Jakonya pile ka;",
      "Konya timo tim maber, kendo konya hero In."
    ],
    [
      "Tim maber onge kuoma; Awuoro kak` ihera;",
      "Ruodha, kaw chunya koro, Obed mari nyaka chieng`."
    ]
  ]),
  chorus: JSON.stringify([
    "Anawer hera Yesu, Anapake gi chunya;",
    "Nosetho e Kalwari, Anawer koheroa."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_039",
  hymnNumber: 39,
  title: "Nitie Wer Mamit E Dhoga",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nitie wer mamit e dhoga, Nikech osewara;",
      "Kuom Jawarna, Yesu, Ruodha, Nikech osewara."
    ],
    [
      "Kristo En ng`a moyieng`o chuny, Nikech osewara;",
      "Adwaro timo dwarone nikech osewara."
    ],
    [
      "Adwaro bed janenone, Nikech osewara;",
      "Aonge kiawa e chunya, Nikech osewara."
    ],
    [
      "Olosona kar bet malo, Nikech osewara;",
      "Nadag kanyo ma nyaka chieng`, Nikech osewara."
    ]
  ]),
  chorus: JSON.stringify([
    "Nikech osewara, nikech osewara;",
    "Adwaro pako nyinge, nikech osewara;",
    "Adwaro pako nying Jawarna."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_040",
  hymnNumber: 40,
  title: "Nonindo E Liel Yesu Jakonya",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Nonindo ei liel, Yesu Jakonya;",
      "Korito chieng` mar chier, Yesu Ruodha."
    ],
    [
      "To ne girito liel, Yesu Jakonya;",
      "Kayiem ne girite, Yesu Ruodha."
    ],
    [
      "Tho ok noloyo En, Yesu Jakonya;",
      "Nogolo twech duto, Yesu Ruodha."
    ]
  ]),
  chorus: JSON.stringify([
    "En to nowuok ae liel Ka nobuko loyo tho adier,",
    "En mochier kotieko mudho chutho ka,",
    "To obet tinende kod Malaika;",
    "To nochier, En nochier,",
    "Alleluia! Ruoth nochier."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_041",
  hymnNumber: 41,
  title: "E Kalwari Jawar Notho",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "E Kalwari - Jawar notho,",
      "E kanyono, Jawar nogur;",
      "E wi yadhno, Rembe nochwer,",
      "Kendo nokawo chandruokna."
    ],
    [
      "E dier luanda - Polo dudo,",
      "Chuny Jawarna, nochot kanyo;",
      "Law ma noyiech, nosiemo yo,",
      "Madhi e mor ma ok norum."
    ],
    [
      "O Yesu Ruoth - Nobed nade!",
      "Nichiwo ngimani ni an;",
      "Mar ting`o chuat, Msalaba,",
      "E saa malich, E Kalwari."
    ]
  ]),
  chorus: JSON.stringify([
    "E Kalwari kanyo molil,",
    "Kama Remb Yesu nochwerna;",
    "E Kalwari manogwedhi,",
    "Kanyo Jawarna nothona."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_042",
  hymnNumber: 42,
  title: "Hera Ma Yesu Hera Go",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Hera ma Yesu hera go, ma nomiyo otho e yath,",
      "Mondo owena richona, oloyo lep wacho."
    ],
    [
      "Kuyo maduong` manoyudo, g`osimb kudho ma nosidhne,",
      "Mond` ayud ngima nyaka chieng`, Oloyo lep wacho."
    ],
    [
      "Kuwe maduong` ma ango kuome, en masayona nyim Nyasaye,",
      "rembe maler mano chuerna, oloyo lep wacho."
    ],
    [
      "Mor mayudo ka En buta, kanindo anto ok naluor,",
      "Genona kuome duong` chutho, oloyo lep wacho."
    ]
  ]),
  chorus: JSON.stringify([
    "Herane loyo lep wacho; Herane loyo lep wacho,",
    "Hera ma Yesu herago, oloyo lep wacho."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_043",
  hymnNumber: 43,
  title: "Adwaro Ngeyo Wach Yesu",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Adwaro ng`eyo wach Yesu, ndiki duto e chunya;",
      "Bi, nyisa weche madieri, Mitna moloyo duto.",
      "Kona kaka malaika yandi nopoyo jokwath;",
      "Noelnigi nyuol Yesu Motimore Bethlehem."
    ],
    [
      "Puonja wach temruok mar Yesu, tem ma nothung`e e thim;",
      "kaka jachien ne osande, Kaka Yesu noloyo.",
      "Puonja wach chandruokne duto,",
      "Bende kuom ting`ne mapek;",
      "Puonja kaka ji nochaye, Kaka nogoye malit."
    ],
    [
      "Ne gigure e msalaba, mane wach modhiera ngang`;",
      "Kanyo nonwang`o masira, to noyie tho nikech wan.",
      "Hera maduong`, ee, awuoro, mokadho hera mar ji;",
      "Ita opowore koro, chunya amiye chutho."
    ]
  ]),
  chorus: JSON.stringify([
    "Nwona tich duto mag Yesu, ndik wechene e chunya;",
    "Puonja gi puonjruok madieri, Mamit moloyo duto."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_044",
  hymnNumber: 44,
  title: "Ang'eyo Yesu Osewara",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ang`eyo Yesu osewara",
      "Kuom herane gi ng`wonone;",
      "E nengo mochulo e thone,",
      "Omiya bedo nyathine."
    ],
    [
      "Amor nikech Ruoth osewara;",
      "Onge dhum ma dahul godo,",
      "Herano ma an go e chunya,",
      "ka koro Yesu dak koda."
    ],
    [
      "Ageno neno Ruodha Yesu;",
      "E duong`ne gi berne duto;",
      "Otayo tienda e wang` yore,",
      "Oketo chikne e chunya."
    ],
    [
      "E dala maler mar Nyasachwa;",
      "Osimb ngima oritoa;",
      "Chieng` moro kobiro gi duong`ne,",
      "Eka nabed kode polo."
    ]
  ]),
  chorus: JSON.stringify([
    "Osewara! Yesu owara gi rembe;",
    "Osewara! Asebet nyathine chutho."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_045",
  hymnNumber: 45,
  title: "Ndalo Mamor",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ndalo mamor, ka nahulo kak` ageni, In Jawarna;",
      "Chunya opong` gi mor chutho, Ok dak anyal mung`o wachni."
    ],
    [
      "Wasetimo winjruok kode, An ng`ate chuth to En Ruodha;",
      "An koro aluwo bang`e, Amor nyiso ji kuom Jawar."
    ],
    [
      "Chunya koro oyudo kuwe kapadora kuom Jakonya;",
      "To kik aweye kendo ngang`, Asiki kode nyaka chieng`."
    ]
  ]),
  chorus: JSON.stringify([
    "Mor maduong` ndalono, Ka Yesu noluoko kethna;",
    "Opuonja ritora galam, Otelona e ngimana.",
    "Mor maduong` ndalono ka Yesu noluoko kethna."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_046",
  hymnNumber: 46,
  title: "Chunya Nigi Mor Moloyo",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Chunya nigi mor moloyo kating`o dwonda pako Ruoth;",
      "To ng`a mowinjore pako nying Yesu kuom hera modhiero?"
    ],
    [
      "Yesu ochiwo mor gi kuwe, E chandruok ohoyo chunywa;",
      "Kakuyo to omiya mor; Awuoro herano mar Yesu."
    ],
    [
      "Yesu owinja kayuakne, Oting`a malo kapodho;",
      "E ngimana nyaka thona, nagen hera maduong` mar Yesu."
    ]
  ]),
  chorus: JSON.stringify([
    "Hera maber, miwuoro ngang`,",
    "Hera maduong` mar Yesu;",
    "Hera maber, miwuoro ngang`,",
    "Hera maduong` mar Yesu."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_047",
  hymnNumber: 47,
  title: "Yesu Jawarwa E Bethlehem",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu Jawarwa e Bethlehem chon",
      "Nonyuol e ot, ka ma dhok nindoe;",
      "E, awuoro kaka nowarowa, kaka nowarowa;",
      "Nobiro warowa, nobiro warowa;",
      "Ee, apako nyinge nikech yandi Nobiro warowa."
    ],
    [
      "Yesu Jawarwa e Kalwari chon",
      "Nochulo gopwa, nogonyo chunywa;",
      "Ee, awuoro kaka notho ni wan, kaka notho ni wan;",
      "Nobiro tho ni wan, nobiro tho ni wan;",
      "Ee, apako nyinge nikech yandi Nobiro tho ni wan."
    ],
    [
      "Yesu Jawarwa nomanyowa chon",
      "Ka ne waruenyo, ka ne ok wayie;",
      "Ee, awuoro kaka noluongowa, kaka noluongowa;",
      "Nobiro luongowa, nobiro luongowa;",
      "Ee, apako nyinge nikech yandi Nobiro luongowa."
    ],
    [
      "Yesu Jawarwa chieng` moro nobi,",
      "Nobi mondo oom nyithinde maler;",
      "Ee, awuoro kaka obiro ka, obiro omowa;",
      "Obiro omowa, obiro omowa;",
      "Ee, apako nyinge t`obiro ka, Obiro omowa."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_048",
  hymnNumber: 48,
  title: "Yesu Kristo Oberna Ngang'",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Yesu Kristo oberna ngang`, gima, morna chutho;",
      "En tekona pile pile, Kenda dagora piny;",
      "An kakuyo adhi ire, En osiep maduogo chunya;",
      "Ka chunya pek ohoyoa, osiepna."
    ],
    [
      "Yesu Kristo oberna ngang`, osiepna e chandruok;",
      "Ogwedhowa kadhi ire, To ok nokwera ngang`;",
      "Wang` chieng` maliet gi koth machwe,",
      "Dongonwa cham, bando gi bel;",
      "Chieng` be gi koth oa kuome, Osiepna."
    ],
    [
      "Yesu Kristo oberna ngang`, nabet malong`one;",
      "Danyal nade kwer osiepna, Ka Yesu oyie an;",
      "Kalu ndache, okang` okang`, oritoa e mudho be;",
      "Kalu bang`e e mudho, e chieng`, Osiepna."
    ],
    [
      "Yesu Kristo oberna ngang`, onge moro ka En;",
      "Ayiene En ma koroni, nyaka ngima norum;",
      "Ngima maber gi Osiepna, ngima mosiko mochwere;",
      "Mor mosiko, dak e polo, Gosiepna."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_049",
  hymnNumber: 49,
  title: "Ywaya Machiegni Kodi",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ywaya machiegni kodi, Ruodha;",
      "Ywaya iri, Jawarna maber ngang`;",
      "Ruoth, geng`a kiuma gi bwombi,",
      "Mond` ayud yueyo gi kuwe man kuomi;",
      "Mond` ayud yueyo gi kuwe man kuomi."
    ],
    [
      "Ywaya machiegni kuom ng`wononi;",
      "Onge gima dakel ni Jawarna,",
      "To mana richo man e chunya;",
      "Yiena mondo ipwodha gi rembi,",
      "Yiena mondo ipwodha gi rembi."
    ],
    [
      "Ywaya machiegni, abet mari;",
      "Chunya mor kaweyo richo gi keth,",
      "Mor mag piny duto, pak gi sunga;",
      "Miya Ruodha, Yesu ma nothona;",
      "Miya Ruodha, Yesu ma nothona."
    ],
    [
      "Asik buti ka pod angima,",
      "Kachungo kuomi In e Lwandana;",
      "To nyaka chieng` anabed kodi,",
      "Buti machiegni, Yesu Jawarna,",
      "Buti machiegni, Yesu Jawarna."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_050",
  hymnNumber: 50,
  title: "Kristo Noluoko Richona",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Kristo noluoko richona ,En Jawar miwuoro ngang`!",
      "Ochulo nengo nikech wan, En Jawar miwuoro ngang`!"
    ],
    [
      "Apake kuom remo maler, En Jawar miwuoro ngang`!",
      "Moriwo chunya gi Nyasaye, En Jawar miwuoro ngang`."
    ],
    [
      "Ogolo richo e chunya, En Jawar miwuoro ngang`!",
      "Koro obedo Ruoth maduong`, En Jawar miwuro ngang`."
    ],
    [
      "Owuotho koda yo duto, En Jawar miwuoro ngang`!",
      "Omiya teko mar ritruok, En Jawar miwuoro ngang`!"
    ]
  ]),
  chorus: JSON.stringify([
    "En Jawar miwuoro ngang`!",
    "En Yesu, En Yesu,",
    "En Jawar miwuoro ngang`!",
    "En Yesu Ruodha."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_051",
  hymnNumber: 51,
  title: "Jakwath Nokwayo Rombege",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Jakwath nokwayo rombege Pier ochiko gochiko,",
      "To achiel kuomgi ne olalne ma notimo piero apar.",
      "Adier nolal e got moro, Ne en ku mabor ma onge jakwath."
    ],
    [
      "\"Rombe pier ochiko gochiko ok romi, yaye, Ruoth?",
      "To en oruakoi gang`o kuom achiel mobayo yo?",
      "To gode be orach chutho; Kik ichandri, Ruoth, kayiem nono.\""
    ],
    [
      "\"Rombega ne gidoko pier` apar, Ma nahero adier;",
      "Kat` achiel kuomgi dwaro lalna ok dak ayie chutho;",
      "Kata yo obet marach kama, Anadhi e thim manyo rombe.\""
    ],
    [
      "Ne onge ng`ato kat`achiel Ma nong`eyo chandruokne;",
      "Komanyo e thim mak ojok ngang`,Nyak` owinjo dwonde;",
      "Nonwang`e koyuak kool marach, Ne en ka malich, kodwaro tho."
    ],
    [
      "Jakwath noting`e mos komor, Nodhigo dalane;",
      "Nowacho ni wadgi niya: \"Moruru koro maber,",
      "T`asenwang`o nyarombona, Ma yandi olal e thim ku mabor.\""
    ],
    [
      "To Yesu yandi omanyowa, Nochandore e piny,",
      "Notho ni rombege duto, To rombege ni wan.",
      "Malaika mor moloyo Ka gineno ng`a molokore."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_052",
  hymnNumber: 52,
  title: "Jawar Yesu Itelna E Ngimana",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Jawar Yesu itelna e ngimana mar chandruok",
      "Gapaka mogingore, masiche be mopondo",
      "In Jaloch maduong` mar nam, Jawar Yesu itelna."
    ],
    [
      "Kat` apaka gingore, Inyalo kueyo yamo.",
      "Apaka mager winji kichiko mondo gikwe.",
      "In Jaloch maduong` mar nam, Jawar Yesu itelna."
    ],
    [
      "Ka achiegni gi chopo, ka yembe malich kudho",
      "Edho nam mokwe maber, ka ayiengora kuomi Yie,",
      "Awinji kiwachona, \"Kik iluor anatelni.\""
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_053",
  hymnNumber: 53,
  title: "Wapako Ruoth Ma Jawarwa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wapako Ruoth ma Jawarwa, Muche oriwowa;",
      "To koseriwowa kama Walam gi chuny achiel."
    ],
    [
      "Ochikowa wagene ka, wabed achiel kuome;",
      "Oneg` wawuoth kanyakla ka wachiko yor polo."
    ],
    [
      "Ochiwo michne nijogo mageno nyinge chuth;",
      "Wanyiso ng`wonone kama, kwaherore maber."
    ],
    [
      "Kwawinjore maber e piny, Kwamor kuom Yesu Ruoth,",
      "To mor manade ma nobet kwachokore e polo."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_054",
  hymnNumber: 54,
  title: "Wuod Dhano Ma Ne Otho",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Wuod dhano ma ne otho, Ma nosandi, ma nogur,",
      "En misango mar jopiny, Alleluya! En Jakonya."
    ],
    [
      "Ne gigure Golgotha, Tho malit Owuon noyie;",
      "Chunya mor, nawer kama, Alleluya! En Jakonya."
    ],
    [
      "Jo maricho chon kucha, Ne gisin kode marach;",
      "Rembe to nowarowa; Alleluya! En Jakonya."
    ],
    [
      "Yesu In nitho kama! Nyaka chieng` naluwi ka;",
      "Chunya mor, nawer kama, Alleluya! En Jakonya."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_055",
  hymnNumber: 55,
  title: "Awero Teko Mar Nyasaye",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Awero teko mar Nyasaye Ma noloso gode,",
      "Ma noketo nembe matut, Ma noyaro polo;",
      "Awero rieko mochiko Wang` chieng` mondo mi piny ler;",
      "Dwe to orieny kuom chikne to, Sulwe duto winje."
    ],
    [
      "Awero ng`wono mar Nyasaye Mamiyowa chiemo,",
      "Nochweyo duto gi Wachne, Noneno duto ber,",
      "Ruoth, ka manade mang`iyo aneno tich mag lueti;",
      "Polo ohulo duong` Nyasaye, Piny nyiso herane."
    ],
    [
      "Yien,to gi cham, g`alote be, Duto hulo duong`ni;",
      "Yembe kudho, be koth ochwe Nikech chikni, Ruodhwa,",
      "Duto mimiyo ngima to gibedo e bwo ritni;",
      "Onge kamoro mwadhiye to Nyasaye ni kanyo."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_056",
  hymnNumber: 56,
  title: "Ruoth Awinjo Wach Mar Gwethni",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Ruoth, awinjo wach mar gwethni Ma iolo ni jogi;",
      "Gweth mang`won mahoyo chuny ji; An bende dak ayudi?"
    ],
    [
      "Kik ikadha, yaye Nyasacha, Richo oseloyoa;",
      "Kik iweya, yaye Jakonya, To inyisa ng`wononi."
    ],
    [
      "Kik ikadha, In Wuon ng`wono, Chik tienda e wang`yori;",
      "An agombo luwi pile, Taya pile e piny ka."
    ],
    [
      "Kik ikadha, yaye Jawarna, In Wuon ngima maradier;",
      "Muchi mondo dak e chunya, Kendo puonja wecheni."
    ]
  ]),
  chorus: JSON.stringify([
    "An bende, an bende;",
    "Ol gwethni e chunya, Ruoth."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_057",
  hymnNumber: 57,
  title: "Roho Mar Nyasaye Ibina",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Roho mar Nyasaye, ibina, Luok chunya obed maler;",
      "Bende parona ipwodhi, Bi, ipong` chunya koro."
    ],
    [
      "Roho mar Nyasaye, bi kuoma; Kata ok anyal neni",
      "To adwaro mond` ibina, Bi, ipong` chunya koro."
    ],
    [
      "An ayom, aonge teko, An akulorani, Ruoth;",
      "Roho mar Nyasaye maler, to Mond` imiya tekoni."
    ],
    [
      "Luoka, hoya, thiedha, gwedha; Herani opong`chunya;",
      "Konya, sira, taya pile; Gwethni mond` osik koda."
    ]
  ]),
  chorus: JSON.stringify([
    "Much Nyasaye, mond` ibi, Pong` chunya, asayoi;",
    "Pwodha abed ng`ati chutho,Much Nyasaye,ibi koro."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_058",
  hymnNumber: 58,
  title: "Muya Maler Jatendwa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Muya Maler, Jatendwa, Ibedo butwa pile;",
      "Telnwa mos e wang`yori, Wan jowuoth e piny marach;",
      "Ji gimor ka giwinjo Dwol mamit kokonigi:",
      "\"Jawuoth, dak ibi ira; Lu bang`a, anatelni.\""
    ],
    [
      "In Jakonya, Osiepa chutho, Mantie kodwa pile ka;",
      "Kik iwewa gi parruok, Ka wabedo e mudho;",
      "Ka yembe kudho matek, Chunywa bedo kod luoro;",
      "Luongwa, \"Jawuoth, bi ira; Lu bang`a anatelni.\""
    ],
    [
      "Ka tichwa oserumo, Wagombo yudo yueyo;",
      "Onge gi ma warito Mak mana polo kende;",
      "Onge gi ma wageno To mana remb Jawarwa;",
      "Luongwa, \"Jawuoth, lu bang`a, Iniyud yueyo malo.\""
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_059",
  hymnNumber: 59,
  title: "Muya Maler Winj Alamwa",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Muya Maler, winj alamwa.",
      "Mondo idag e chunywa;",
      "Gi tekoni duto ilor,",
      "Muya Maler, ibi."
    ],
    [
      "Bi kaka ler! Mond` ifwenynwa Kethwa,",
      "Kitwa maricho;",
      "Mond` itelnwa e yor ngima,",
      "En yor jo mabeyo."
    ],
    [
      "Bi kaka mach, ipwodh chunywa,",
      "Kuom gik maricho duto;",
      "Mondo wachiwre ni Ruodhwa,",
      "Misango mangima."
    ],
    [
      "Bi kaka koth, mi igwedhwa,",
      "Ka pod wan nyimi kae;",
      "Dak ipong`wa gi tekoni,",
      "Kiloyo chunywa chuth."
    ],
    [
      "Kaka yamo mondo ibi,",
      "Gi teko kaka chon cha;",
      "Mondo warruok man kuom Yesu,",
      "Olandre piny duto."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_060",
  hymnNumber: 60,
  title: "Much Nyasaye Iler Chutho",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Much Nyasaye, Iler chutho;",
      "Lerni mond` omeny chunya;",
      "Kibedo koda Jakony,",
      "Mudhona duto norum."
    ],
    [
      "Much Nyasaye, ahombi ngang`,",
      "Mi chunya bedo maler;",
      "Nyaka a ndalo mang`eny",
      "Kethruok oseloyoa."
    ],
    [
      "Much Nyasaye, Jakony madier,",
      "Dak e chunya, miya kuwe;",
      "Gol kethruok oko chutho,",
      "Changi chunya man gi tuo."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_061",
  hymnNumber: 61,
  title: "Osiep Manade En Mor Manade",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Osiep manade, en mor manade,",
      "Ka iyiengori kuom Ruoth Yesu.",
      "En gweth manade, en kuwe manade,",
      "Ka iyiengori kuom Ruoth Yesu."
    ],
    [
      "Anyalo wuotho e yorno madiny",
      "Ka ayiengora kuom Ruoth Yesu;",
      "En yo maber madhiyo kar ngima",
      "Ka iyiengori kuom Ruoth Yesu."
    ],
    [
      "Onge gimoro monego aluor",
      "Ka ayiengora kuom Ruoth Yesu.",
      "Ruoth nobed koda ndalo duto te",
      "Ka ayiengora kuom Ruoth Yesu."
    ]
  ]),
  chorus: JSON.stringify([
    "Yiengri, yiengri Kigeno Yesu ma Ruodhi;",
    "Yiengri, yiengri, yiengri kuom Yesu ma nyaka chieng`."
  ]),
  createdAt: now,
  updatedAt: now,
},
{
  id: "LUO_062",
  hymnNumber: 62,
  title: "Aseyudo Osiep Maber",
  language: "luo",
  stanzas: JSON.stringify([
    [
      "Aseyudo Osiep maber, Chon nohera kakia,",
      "Noywaya gi tond Herane, Emomiyo ahere.",
      "Koro oketo e chunya Herane ndalo duto;",
      "An ng`ate, to En Osiepa, Ndalo duto mochwere."
    ],
    [
      "Aseyudo Osiep maber; Notho e msalaba",
      "Ni mond` ayud ngima kuome, Ringre Owuon nomiya.",
      "Gik moko duto ma an go, Ok maga to mag Yesu;",
      "Chunya, ringra, giga duto Ni mag Yesu mochwere."
    ],
    [
      "Aseyudo Osiep maber; Nomiye teko duto;",
      "Mondo orita kawuotho Nyaka adonj e polo.",
      "To ka madhiye agombo par Nyasaye ndalo duto;",
      "Koro atiyo kageno Dak kod Yesu mochwere."
    ],
    [
      "Aseyudo Osiep maber, Maber, mang`won, madieri;",
      "Otelona gi wach maber, En Jakony maratego.",
      "Onge gi manyalo poga Kod En mohera chutho;",
      "Weche mag piny ok nyala ngang`, An ng`ate chuth mochwere."
    ]
  ]),
  chorus: null,
  createdAt: now,
  updatedAt: now,
},
    {
      id: "SW_001",
      hymnNumber: 101,
      title: "Mungu Ibariki Afrika",
      language: "sw",
      stanzas: JSON.stringify([
        [
          "Mungu ibariki Afrika",
          "Wabariki viongozi wake",
        ],
        [
          "Hekima umoja na amani",
          "Hizi ni ngao zetu",
        ]
      ]),
      chorus: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "SW_002",
      hymnNumber: 102,
      title: "Tunaomba Utusamehe",
      language: "sw",
      stanzas: JSON.stringify([
        [
          "Tunaomba utusamehe",
          "Ee Mungu wetu",
        ],
        [
          "Tumekutenda mabaya",
          "Na dhambi nyingi",
        ]
      ]),
      chorus: JSON.stringify([
        "Samehe, samehe, samehe",
        "Ee Mungu wetu samehe"
      ]),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "SW_003",
      hymnNumber: 103,
      title: "Yesu Nikupe Moyo Wangu",
      language: "sw",
      stanzas: JSON.stringify([
        [
          "Yesu nikupe moyo wangu",
          "Nikupe moyo wote",
        ],
        [
          "Uwe Mwokozi na Bwana",
          "Katika maisha yangu",
        ]
      ]),
      chorus: JSON.stringify([
        "Nikupe moyo, nikupe moyo",
        "Yesu nikupe moyo wangu"
      ]),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "EN_001",
      hymnNumber: 1,
      title: "Amazing Grace",
      language: "en",
      author: "John Newton",
      stanzas: JSON.stringify([
        [
          "Amazing grace! How sweet the sound",
          "That saved a wretch like me!",
        ],
        [
          "I once was lost, but now am found;",
          "Was blind, but now I see.",
        ]
      ]),
      chorus: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "EN_003",
      hymnNumber: 247,
      title: "What a Friend We Have in Jesus",
      language: "en",
      author: "Joseph M. Scriven",
      stanzas: JSON.stringify([
        [
          "What a friend we have in Jesus",
          "All our sins and griefs to bear!",
        ],
        [
          "What a privilege to carry",
          "Everything to God in prayer!",
        ]
      ]),
      chorus: null,
      createdAt: now,
      updatedAt: now,
    },

     {
      id: "KI_001",
      hymnNumber: 1,
      title: "Mano Ber Jokama",
      language: "ki",
      stanzas: JSON.stringify([
        [
          "Yesu nikupe moyo wangu",
          "Nikupe moyo wote",
        ],
        [
          "Uwe Mwokozi na Bwana",
          "Katika maisha yangu",
        ]
      ]),
      chorus: JSON.stringify([
        "Nikupe moyo, nikupe moyo",
        "Yesu nikupe moyo wangu"
      ]),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "EN_004",
      hymnNumber: 248,
      title: "I Have Decided to Follow Jesus",
      language: "en",
      author: "Traditional",
      stanzas: JSON.stringify([
        [
          "I have decided to follow Jesus",
          "I have decided to follow Jesus",
        ],
        [
          "No turning back, no turning back",
          "No turning back, no turning back",
        ]
      ]),
      chorus: JSON.stringify([
        "The world behind me, the cross before me",
        "No turning back, no turning back"
      ]),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedLanguages = [
    { code: "en", name: "English" },
    { code: "sw", name: "Swahili" },
    { code: "luo", name: "Luo" },
    { code: "ki", name: "Kikuyu" },

  ];

  await db.withTransactionAsync(async () => {
    for (const s of sampleSongs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO songs
          (id, hymnNumber, title, language, author, stanzas, chorus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.hymnNumber,
          s.title,
          s.language,
          s.author ?? null,
          s.stanzas,
          s.chorus,
          s.createdAt,
          s.updatedAt,
        ]
      );
    }

    for (const lang of seedLanguages) {
      await db.runAsync(
        "INSERT OR IGNORE INTO languages (id, code, name) VALUES (?, ?, ?)",
        [lang.code, lang.code, lang.name]
      );
    }
  });
}

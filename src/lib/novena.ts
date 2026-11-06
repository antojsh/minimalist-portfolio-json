// Novena de aguinaldos: texto tradicional de Fray Fernando de Jesús Larrea (siglo XVIII),
// con las modificaciones de la Madre María Ignacia (Bertilda Samper Acosta), que agregó los gozos.
// Cotejado con las versiones publicadas por el IDT de Bogotá y por Caracol Televisión.

import { MONTHS, WEEKDAYS, weekdayOf } from "@/lib/festivos";

export const NOVENA_REVIEW = "2026-11-06";

/** Días de la novena: del 16 al 24 de diciembre */
export function novenaDates(year: number) {
    return Array.from({ length: 9 }, (_, index) => {
        const date = `${year}-12-${String(16 + index).padStart(2, "0")}`;
        return { day: index + 1, date, weekday: WEEKDAYS[weekdayOf(date)], label: `${WEEKDAYS[weekdayOf(date)]} ${16 + index} de ${MONTHS[11]}` };
    });
}

/** Día de la novena que toca hoy (1 a 9), o null fuera del 16 al 24 de diciembre */
export function novenaDayOn(today: string) {
    if (today.slice(5, 7) !== "12") return null;
    const day = Number(today.slice(8)) - 15;
    return day >= 1 && day <= 9 ? day : null;
}

export const ORDINALS = ["primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno"];

export interface Prayer {
    id: string;
    title: string;
    /** Párrafos */
    text: string[];
    /** Indicación en rojo, como en los devocionarios */
    rubric?: string;
}

export const PRAYER_DAILY: Prayer = {
    id: "oracion-para-todos-los-dias",
    title: "Oración para todos los días",
    text: [
        "Benignísimo Dios de infinita caridad, que tanto amasteis a los hombres, que les disteis en vuestro Hijo la mejor prenda de vuestro amor, para que hecho hombre en las entrañas de una Virgen naciese en un pesebre para nuestra salud y remedio; yo, en nombre de todos los mortales, os doy infinitas gracias por tan soberano beneficio.",
        "En retorno de él os ofrezco la pobreza, humildad y demás virtudes de vuestro Hijo humanado, suplicándoos por sus divinos méritos, por las incomodidades en que nació y por las tiernas lágrimas que derramó en el pesebre, que dispongáis nuestros corazones con humildad profunda, con amor encendido, con tal desprecio de todo lo terreno, para que Jesús recién nacido tenga en ellos su cuna y more eternamente. Amén.",
    ],
    rubric: "Se reza tres veces el Gloria al Padre.",
};

export const PRAYER_MARY: Prayer = {
    id: "oracion-a-la-virgen",
    title: "Oración a la Santísima Virgen",
    text: [
        "Soberana María, que por vuestras grandes virtudes y especialmente por vuestra humildad, merecisteis que todo un Dios os escogiese por madre suya, os suplico que vos misma preparéis y dispongáis mi alma, y la de todos los que en este tiempo hiciesen esta novena, para el nacimiento espiritual de vuestro adorado Hijo. ¡Oh dulcísima Madre! Comunicadme algo del profundo recogimiento y divina ternura con que lo aguardasteis vos, para que nos hagáis menos indignos de verle, amarle y adorarle por toda la eternidad. Amén.",
    ],
    rubric: "Se reza tres veces el Avemaría.",
};

export const PRAYER_JOSEPH: Prayer = {
    id: "oracion-a-san-jose",
    title: "Oración a San José",
    text: [
        "¡Oh santísimo José, esposo de María y padre adoptivo de Jesús! Infinitas gracias doy a Dios porque os escogió para tan altos ministerios y os adornó con todos los dones proporcionados a tan excelente grandeza. Os ruego, por el amor que tuvisteis al Divino Niño, me abraséis en fervorosos deseos de verle y recibirle sacramentalmente, mientras en su divina esencia le veo y le gozo en el cielo. Amén.",
    ],
    rubric: "Se reza un Padrenuestro, un Avemaría y un Gloria al Padre.",
};

export const PRAYER_CHILD: Prayer = {
    id: "oracion-al-nino-jesus",
    title: "Oración al Niño Jesús",
    text: [
        "Acordaos, ¡oh dulcísimo Niño Jesús!, que dijisteis a la venerable Margarita del Santísimo Sacramento, y en persona suya a todos vuestros devotos, estas palabras tan consoladoras para nuestra pobre humanidad agobiada y doliente: «Todo lo que quieras pedir, pídelo por los méritos de mi infancia y nada te será negado».",
        "Llenos de confianza en vos, ¡oh Jesús!, que sois la misma verdad, venimos a exponeros toda nuestra miseria. Ayudadnos a llevar una vida santa, para conseguir una eternidad bienaventurada. Concedednos, por los méritos infinitos de vuestra encarnación y de vuestra infancia, la gracia de la cual necesitamos tanto.",
        "Nos entregamos a vos, ¡oh Niño omnipotente!, seguros de que no quedará frustrada nuestra esperanza, y de que en virtud de vuestra divina promesa, acogeréis y despacharéis favorablemente nuestra súplica. Amén.",
    ],
};

/** Gozos: aspiraciones para la venida del Niño Dios */
export const GOZOS = {
    intro: "Dulce Jesús mío, mi Niño adorado,",
    refrain: "¡Ven a nuestras almas! ¡Ven, no tardes tanto!",
    stanzas: [
        "¡Oh Sapiencia suma del Dios soberano, que a infantil alcance te rebajas sacro! ¡Oh Divino Niño, ven para enseñarnos la prudencia que hace verdaderos sabios!",
        "¡Oh Adonaí potente que, a Moisés hablando, de Israel al pueblo disteis los mandatos! ¡Ah, ven prontamente para rescatarnos, y que un niño débil muestre fuerte el brazo!",
        "¡Oh raíz sagrada de José, que en lo alto presentas al orbe tu fragante nardo! ¡Dulcísimo Niño que has sido llamado lirio de los valles, bella flor del campo!",
        "¡Llave de David que abre al desterrado las cerradas puertas del regio palacio! ¡Sácanos, oh Niño, con tu blanda mano, de la cárcel triste que labró el pecado!",
        "¡Oh lumbre de Oriente, sol de eternos rayos, que entre las tinieblas tu esplendor veamos! ¡Niño tan precioso, dicha del cristiano, luzca la sonrisa de tus dulces labios!",
        "¡Espejo sin mancha, santo de los santos, sin igual imagen del Dios soberano! ¡Borra nuestras culpas, salva al desterrado y, en forma de niño, da al mísero amparo!",
        "¡Rey de las naciones, Emmanuel preclaro, de Israel anhelo, pastor del rebaño! ¡Niño que apacientas con suave cayado ya la oveja arisca, ya el cordero manso!",
        "¡Ábranse los cielos y llueva de lo alto bienhechor rocío como riego santo! ¡Ven, hermoso Niño, ven, Dios humanado! ¡Luce, hermosa estrella! ¡Brota, flor del campo!",
        "¡Ven, que ya María previene sus brazos, do su Niño vean, en tiempo cercano! ¡Ven, que ya José, con anhelo sacro, se dispone a hacerse de tu amor sagrario!",
        "¡Del débil auxilio, del doliente amparo, consuelo del triste, luz del desterrado! ¡Vida de mi vida, mi dueño adorado, mi constante amigo, mi divino hermano!",
        "¡Véante mis ojos, de ti enamorados! ¡Bese ya tus plantas! ¡Bese ya tus manos! ¡Prosternado en tierra te tiendo los brazos, y aún más que mis frases te dice mi llanto!",
    ],
    closing: "¡Ven, Salvador nuestro, por quien suspiramos!",
};

/** Consideración de cada día */
export const CONSIDERATIONS: string[][] = [
    [
        "En el principio de los tiempos el Verbo reposaba en el seno de su Padre en lo más alto de los cielos; allí era la causa, a la par que el modelo de toda la creación. En esas profundidades de una incalculable eternidad permanecía el Niño de Belén antes de que se dignara bajar a la tierra y tomara visiblemente posesión de la gruta de Belén. Allí es donde debemos buscar sus principios que jamás han comenzado; de allí debemos datar la genealogía de lo eterno, que no tiene antepasados, y contemplar la vida de complacencia infinita que allí llevaba.",
        "La vida del Verbo eterno en el seno de su Padre era una vida maravillosa y, sin embargo, ¡misterio sublime!, busca otra morada, una mansión creada. No era porque en su mansión eterna faltase algo a su infinita felicidad, sino porque su misericordia infinita anhelaba la redención y la salvación del género humano, que sin Él no podría verificarse.",
        "El pecado de Adán había ofendido a Dios y esa ofensa infinita no podía ser condonada sino por los méritos del mismo Dios. La raza de Adán había desobedecido y merecido un castigo eterno; era pues necesario para salvarla y satisfacer su culpa, que Dios, sin dejar el cielo, tomase la forma del hombre sobre la tierra y con la obediencia a los designios de su Padre expiase aquella desobediencia, ingratitud y rebeldía. Era necesario, en las miras de su amor, que tomase la forma, las debilidades e ignorancias sistemáticas del hombre; que creciese, para darle crecimiento espiritual; que sufriese, para enseñarle a morir a sus pasiones y a su orgullo. Y por eso el Verbo eterno, ardiendo en deseos de salvar al hombre, resolvió hacerse hombre también y así redimir al culpable.",
    ],
    [
        "El Verbo eterno se halla a punto de tomar su naturaleza creada en la santa casa de Nazaret, en donde moraban María y José. Cuando la sombra del decreto divino vino a deslizarse sobre ella, María estaba sola, engolfada en la oración. Pasaba las silenciosas horas de la noche en la unión más estrecha con Dios; y mientras oraba, el Verbo tomó posesión de su morada creada.",
        "Sin embargo, no llegó inopinadamente: antes de presentarse envió a un mensajero, que fue el arcángel San Gabriel, para pedir a María de parte de Dios su consentimiento para la encarnación. El Creador no quiso efectuar ese gran misterio sin la aquiescencia de su criatura.",
        "Aquel momento fue muy solemne: era potestativo en María rehusar… ¡Con qué adorables delicias, con qué inefable complacencia aguardaría la Santísima Trinidad a que María abriese los labios y pronunciase el «sí» que debió ser suave melodía para sus oídos, y con el cual se conformaba su profunda humildad a la omnipotente voluntad divina!",
        "La Virgen Inmaculada ha dado su asentimiento. El arcángel ha desaparecido. Dios se ha revestido de una naturaleza creada; la voluntad eterna está cumplida y la creación completa. En las regiones del mundo angélico estalla el júbilo inmenso, pero la Virgen María ni le oía ni le hubiese prestado atención. Tenía inclinada la cabeza y su alma estaba sumida en un silencio que se asemejaba al de Dios. El Verbo se había hecho carne, y aunque todavía invisible para el mundo, habitaba ya entre los hombres que su inmenso amor había venido a rescatar.",
        "No era ya solo el Verbo eterno; era el Niño Jesús revestido de la apariencia humana, y justificando ya el elogio que de Él han hecho todas las generaciones al llamarle el más hermoso de los hijos de los hombres.",
    ],
    [
        "Así había comenzado su vida encarnada el Niño Jesús. Consideremos el alma gloriosa y el santo cuerpo que había tomado, adorándolos profundamente.",
        "Admirando en primer lugar el alma de ese Divino Niño, consideremos en ella la plenitud de su gracia santificadora; la de su ciencia beatífica, por la cual desde el primer momento de su vida vio la divina esencia más claramente que todos los ángeles y leyó lo pasado y lo porvenir con todos sus arcanos conocimientos. No supo por adquisición nada que no supiese por infusión desde el primer momento de su ser; pero Él adoptó todas las enfermedades de nuestra naturaleza a que dignamente podía someterse, aun cuando no fuese necesario para la grande obra que debía cumplir. Pidámosle que sus divinas facultades suplan la debilidad de las nuestras y les den nueva energía; que su memoria nos enseñe a recordar sus beneficios, su entendimiento a pensar en Él, su voluntad a no hacer sino lo que Él quiere y en servicio suyo.",
        "Del alma del Niño Jesús pasemos ahora a su cuerpo, que era un mundo de maravillas, una obra maestra de la mano de Dios. No era, como el nuestro, una traba para el alma; era, por el contrario, un nuevo elemento de santidad. Quiso que fuese pequeño y débil como el de los niños, y sujeto a todas las incomodidades de la infancia, para asemejarse más a nosotros y participar de nuestras humillaciones. El Espíritu Santo formó ese cuerpecillo divino con tal delicadeza y tal capacidad de sentir, que pudiese sufrir con exceso para cumplir la grande obra de nuestra redención.",
        "La belleza de ese cuerpo divino fue superior a cuanto se ha imaginado jamás, y la divina sangre que por sus venas empezó a circular desde el momento de la encarnación es la que lava todas las manchas del mundo culpable. Pidámosle que lave las nuestras en el sacramento de la penitencia, para que el día de su Navidad nos encuentre purificados, perdonados y dispuestos a recibirle con amor y provecho espiritual.",
    ],
    [
        "Desde el seno de su madre comenzó el Niño Jesús a poner en práctica su entera sumisión a Dios, que continuó sin la menor interrupción durante toda su vida. Adoraba a su Eterno Padre, le amaba, se sometía a su voluntad, aceptaba con resignación el estado en que se hallaba, conociendo toda su debilidad, toda su humillación, todas sus incomodidades.",
        "¿Quién de nosotros quisiera retroceder a un estado semejante con el pleno goce de la razón y de la reflexión? ¿Quién pudiera sostener a sabiendas un martirio tan prolongado, tan penoso de todas maneras? Por ahí entró el Divino Niño en su dolorosa y humilde carrera; así empezó a anonadarse delante de su Padre, a enseñarnos lo que Dios merece por parte de su criatura, a expiar nuestro orgullo, origen de todos nuestros pecados, y a hacernos sentir toda la criminalidad y desórdenes del orgullo.",
        "¿Deseamos hacer una verdadera oración? Empecemos por formarnos de ella una exacta idea, contemplando al Niño en el seno de su madre. El Divino Niño ora, y ora del modo más excelente. No habla, no medita, ni se deshace en tiernos afectos. Su mismo estado, aceptado con la intención de honrar a Dios, es su oración, y ese estado expresa altamente todo lo que Dios merece y de qué modo quiere ser adorado por nosotros.",
        "Unámonos a las adoraciones del Niño Dios en el seno de María; unámonos a su profundo abatimiento y sea este el primer efecto de nuestro sacrificio a Dios. Démonos a Dios, no para ser algo, como lo pretende continuamente nuestra vanidad, sino para ser nada, para quedar eternamente consumidos y anonadados, para renunciar a la estimación de nosotros mismos, a todo cuidado de nuestra grandeza aunque sea espiritual, a todo movimiento de vanagloria. Desaparezcamos a nuestros propios ojos y que Dios solo sea todo para nosotros.",
    ],
    [
        "Ya hemos visto la vida que llevaba el Niño Jesús en el seno de su purísima Madre; veamos hoy la vida que llevaba también María durante el mismo espacio de tiempo. Necesidad hay de que nos detengamos en ella si queremos comprender, en cuanto es posible a nuestra limitada capacidad, los sublimes misterios de la encarnación y el modo como hemos de corresponder a ellos.",
        "María no cesaba de aspirar por el momento en que gozaría de esa visión beatífica terrestre: la faz de Dios encarnado. Estaba a punto de ver aquella faz humana que debía iluminar el cielo durante toda la eternidad; iba a leer el amor filial en aquellos mismos ojos cuyos rayos deberían esparcir para siempre la felicidad en millones de elegidos. Iba a ver aquel rostro todos los días, a todas horas, cada instante, durante muchos años. Iba a verle en la ignorancia aparente de la infancia, en los encantos particulares de la juventud y en la serenidad reflexiva de la edad madura… Haría todo lo que quisiese de aquella faz divina; podría estrecharla contra la suya con toda la libertad del amor materno; cubrir de besos los labios que deberían pronunciar la sentencia a todos los hombres; contemplarla a su gusto durante su sueño o despierta, hasta que la hubiese aprendido de memoria… ¡Cuán ardientemente deseaba ese día!",
        "¡Tal era la vida de expectativa de María! Era inaudita en sí misma, mas no por eso dejaba de ser el tipo magnífico de toda vida cristiana. No nos contentemos con admirar a Jesús residiendo en María, sino pensemos que en nosotros también reside por esencia, potencia y presencia.",
        "Sí, Jesús nace continuamente en nosotros y de nosotros, por las buenas obras que nos hace capaces de cumplir y por nuestra cooperación a la gracia; de manera que el alma del que se halla en gracia es un seno perpetuo de María, un Belén interior sin fin. Después de la comunión, Jesús habita en nosotros durante algunos instantes, real y sustancialmente como Dios y como hombre, porque el mismo Niño que estaba en María está también en el Santísimo Sacramento. ¿Qué es todo esto sino una participación de la vida de María durante esos maravillosos meses, y una expectativa llena de delicias como la suya?",
    ],
    [
        "Jesús había sido concebido en Nazaret, domicilio de José y María, y allí era de creerse que había de nacer, según todas las probabilidades. Mas Dios lo tenía dispuesto de otra manera, y los profetas habían anunciado que el Mesías nacería en Belén de Judá, ciudad de David.",
        "Para que se cumpliese esa predicción, Dios se sirvió de un medio que no parecía tener ninguna relación con este objeto, a saber: la orden dada por el emperador Augusto de que todos los súbditos del imperio romano se empadronasen en el lugar de donde eran originarios. María y José, como descendientes que eran de David, no estaban dispensados de ir a Belén. Ni la situación de la Virgen Santísima, ni la necesidad en que estaba José del trabajo diario que les aseguraba la subsistencia, pudo eximirles de este largo y penoso viaje, en la estación más rigurosa e incómoda del año.",
        "No ignoraba Jesús en qué lugar debía nacer, y así inspira a sus padres que se entreguen a la Providencia, y que de esta manera concurran inconscientemente a la ejecución de sus designios. Almas interiores, observad este manejo del Divino Niño, porque es el más importante de la vida espiritual: aprended que quien se haya entregado a Dios ya no ha de pertenecerse a sí mismo, ni ha de querer a cada instante sino lo que Dios quiera para él, siguiéndole ciegamente aun en las cosas exteriores, tales como el cambio de lugar dondequiera que le plazca conducirle. Ocasión tendréis de observar esta dependencia y fidelidad inviolable en toda la vida de Jesucristo, y este es el punto sobre el cual se han esmerado en imitarle los santos y las almas verdaderamente interiores, renunciando absolutamente a su propia voluntad.",
    ],
    [
        "Representémonos el viaje de María y José hacia Belén, llevando consigo, aún no nacido, al Creador del universo hecho hombre. Contemplemos la humildad y la obediencia de este Divino Niño que, aunque de raza judía y habiendo amado durante siglos a su pueblo con una predilección inexplicable, obedece así a un príncipe extranjero que forma el censo de población de su provincia, como si hubiese para Él en esa circunstancia algo que le halagase, y quisiese apresurarse a aprovechar la ocasión de hacerse empadronar oficial y auténticamente como súbdito en el momento en que venía al mundo. ¿No es extraño que la humillación, que causa tan invencible repugnancia a la criatura, parezca ser la única cosa creada que tenga atractivos para el Creador? ¿No nos enseñará la humildad de Jesús a amar esa hermosa virtud?",
        "¡Ah! Que llegue el momento en que aparezca el deseado de las naciones, porque todo clama por este feliz acontecimiento. El mundo, sumido en la oscuridad y el malestar, buscando y no encontrando el alivio de sus males, suspira por su Libertador. El anhelo de José, la expectativa de María, son cosas que no puede expresar el lenguaje humano. El Padre Eterno se halla, si es lícito emplear esta expresión, adorablemente impaciente por dar a su Hijo único al mundo y verle ocupar su puesto entre las criaturas visibles.",
        "El Espíritu Santo arde en deseos de presentar a la luz del día esa santa humanidad tan bella, que Él mismo ha formado con tan especial y divino esmero. En cuanto al Divino Niño, objeto de tantos anhelos, recordemos que hacia nosotros avanza lo mismo que hacia Belén. Apresuremos con nuestro deseo el momento de su llegada; purifiquemos nuestras almas para que sean su mística morada, y nuestros corazones para que sean su mansión terrenal; que nuestros actos de mortificación y desprendimiento «preparen los caminos del Señor y hagan rectos sus senderos».",
    ],
    [
        "Llegan a Belén José y María buscando hospedaje en los mesones, pero no lo encuentran, ya por hallarse todo ocupado, ya porque se les desechase a causa de su pobreza. Empero, nada puede turbar la paz interior de los que están fijos en Dios. Si José experimentaba tristeza cuando era rechazado de casa en casa, porque pensaba en María y en el Niño, sonreía también con santa tranquilidad cuando fijaba sus miradas en su casta esposa. El Niño aún no nacido se regocijaba de aquellas negativas, que eran el preludio de sus humillaciones venideras. Cada voz áspera, el ruido de cada puerta que se cerraba ante ellos, era lo que había venido a buscar. El deseo de esas humillaciones era lo que había contribuido a hacerle tomar la forma humana.",
        "¡Oh Divino Niño de Belén! Estos días que tantos han pasado en fiestas y diversiones, o descansando muellemente en cómodas y ricas mansiones, han sido para vuestros padres días de fatiga y vejaciones de toda clase. ¡Ay! El espíritu de Belén es el de un mundo que ha olvidado a Dios. ¡Cuántas veces no ha sido también el nuestro! ¿No cerramos continuamente con ruda ignorancia la puerta a los llamamientos de Dios, que nos solicita convertirnos, o santificarnos, o conformarnos con su voluntad? ¿No hacemos mal uso de nuestras penas, desconociendo el carácter celestial que cada una, a su modo, lleva grabado en sí? Dios viene a nosotros muchas veces en la vida, pero no conocemos su faz, o le reconocemos hasta que nos vuelve la espalda y se aleja después de nuestra negativa.",
        "Se pone el sol del 24 de diciembre detrás de los tejados de Belén y sus últimos rayos doran las cimas de las rocas escarpadas que lo rodean. Hombres groseros codean rudamente al Señor en las calles de aquella aldea oriental, y cierran sus puertas al ver a su Madre. La bóveda de los cielos aparece purpurina por encima de aquellas colinas frecuentadas por los pastores. Las estrellas van apareciendo una tras otra. Algunas horas más y aparecerá el Verbo eterno.",
    ],
    [
        "La noche ha cerrado del todo en las campiñas de Belén. Desechados por los hombres y viéndose sin abrigo, María y José han salido de la inhospitalaria población y se han refugiado en una gruta que se encontraba al pie de la colina. Seguía a la Reina de los Ángeles el jumento que le había servido de humilde cabalgadura durante el viaje, y en aquella cueva hallaron un manso buey, dejado allí probablemente por alguno de los caminantes que habían ido a buscar hospedaje en la ciudad.",
        "El Divino Niño, desconocido por sus criaturas racionales, va a tener que acudir a los irracionales para que calienten con su tibio aliento la atmósfera helada de esa noche de invierno, y le manifiesten con esto y con su humilde actitud el respeto y la adoración que le había negado Belén. La rojiza linterna que José tiene en la mano ilumina tenuemente ese pobrísimo recinto, ese pesebre lleno de paja que es figura profética de las maravillas del altar y de la íntima y prodigiosa unión eucarística que Jesús ha de contraer con los hombres. María está en adoración en medio de la gruta, y así van pasando silenciosamente las horas de esa noche llena de misterios.",
        "Pero ha llegado la medianoche, y de repente vemos dentro de ese pesebre, poco antes vacío, al Divino Niño esperado, vaticinado, deseado durante cuatro mil años con inefable anhelo. A sus pies se postra su Santísima Madre, en los transportes de una adoración de la cual nada puede dar idea. José también se acerca y le rinde el homenaje con que inaugura su misterioso e imponderable oficio de padre adoptivo del Redentor de los hombres.",
        "La multitud de ángeles que desciende del cielo a contemplar esa maravilla sin par deja estallar su alegría y hace vibrar en los aires las armonías de ese «Gloria in excelsis», que es el eco de la adoración que se produce en torno del Altísimo, hecha perceptible por un instante a los oídos de la pobre tierra. Convocados por ellos, vienen en tropel los pastores de la comarca a adorar al recién nacido y presentarle sus humildes ofrendas. Ya brilla en Oriente la misteriosa estrella de Jacob, y ya se pone en marcha hacia Belén la caravana espléndida de los Reyes Magos, que dentro de pocos días vendrán a depositar a los pies del Divino Niño el oro, el incienso y la mirra, que son símbolos de la caridad, la adoración y la mortificación.",
        "¡Oh adorado Niño! Nosotros también, los que hemos hecho esta novena para prepararnos al día de vuestra Navidad, queremos ofreceros nuestra pobre adoración. ¡No la rechacéis! ¡Venid a nuestras almas, venid a nuestros corazones llenos de amor! Encended en ellos la devoción a vuestra santa infancia, no intermitente y solo circunscrita al tiempo de vuestra Navidad, sino siempre y en todos los tiempos; devoción que, fielmente practicada y celosamente propagada, nos conduzca a la vida eterna, librándonos del pecado y sembrando en nosotros todas las virtudes cristianas.",
    ],
];

/** Una frase para cada día, para el selector */
export const DAY_THEMES = [
    "El Verbo en el seno del Padre",
    "La Anunciación",
    "El alma y el cuerpo del Niño",
    "La oración del Niño en el seno de María",
    "La espera de María",
    "El camino a Belén",
    "El viaje de María y José",
    "No hay lugar en la posada",
    "El nacimiento en el pesebre",
];

/** Villancicos tradicionales de dominio público, con letra completa */
export const CAROLS: { title: string; chorus?: string; verses: string[] }[] = [
    {
        title: "Tutaina",
        chorus: "Tutaina tuturumá, tutaina tuturumaina, tutaina tuturumá, turumá, tutaina tuturumaina.",
        verses: [
            "Los pastores de Belén vienen a adorar al Niño; la Virgen y San José los reciben con cariño.",
            "Tres reyes vienen también con incienso, mirra y oro, a ofrendar a Dios su bien con el más grande tesoro.",
            "Vamos todos a cantar con amor y alegría, porque acaba de llegar de los cielos el Mesías.",
        ],
    },
    {
        title: "Los peces en el río",
        chorus: "Pero mira cómo beben los peces en el río, pero mira cómo beben por ver a Dios nacido. Beben y beben y vuelven a beber los peces en el río por ver a Dios nacer.",
        verses: [
            "La Virgen se está peinando entre cortina y cortina; sus cabellos son de oro y el peine de plata fina.",
            "La Virgen está lavando y tendiendo en el romero; los angelitos cantando y el romero floreciendo.",
            "La Virgen está lavando con muy poquito jabón; se le picaron las manos, manos de mi corazón.",
        ],
    },
    {
        title: "Campana sobre campana",
        chorus: "Belén, campanas de Belén, que los ángeles tocan, ¿qué nuevas me traéis?",
        verses: [
            "Campana sobre campana, y sobre campana una, asómate a la ventana, verás al Niño en la cuna.",
            "Recogido tu rebaño, ¿a dónde vas, pastorcillo? Voy a llevar al portal requesón, manteca y vino.",
            "Campana sobre campana, y sobre campana dos, asómate a esa ventana, porque está naciendo Dios.",
            "Caminando a medianoche, ¿dónde caminas, pastor? Le llevo al Niño que nace, como a Dios, mi corazón.",
        ],
    },
    {
        title: "Antón tiruriruriru",
        chorus: "Antón tiruriruriru, Antón tiruriruriá; Jesús al pesebre vamos a adorar.",
        verses: [
            "Duérmete, Niño chiquito, que la noche viene ya; cierra pronto tus ojitos, que el viento te arrullará.",
            "Duérmete, Niño chiquito, que tu madre velará; cierra pronto tus ojitos, porque la entristecerás.",
            "Ya dormido en el regazo de María, el Salvador va soñando dulcemente música y cantos de amor.",
        ],
    },
];

/** Villancicos que también se cantan y que tienen autor conocido (solo el nombre) */
export const MORE_CAROLS = [
    "Mi burrito sabanero",
    "El tamborilero",
    "Noche de paz",
    "A la nanita nana",
    "Ya vienen los Reyes Magos",
    "Los pastores a Belén",
    "Vamos pastores, vamos",
    "Arre borriquito",
];

/** Juegos de aguinaldo tradicionales */
export const GAMES = [
    { name: "Pajita en boca", rule: "Durante los días que dure el juego hay que llevar una pajita en la boca. Pierde quien sea pillado sin ella cuando el otro la pide." },
    { name: "Sí y no", rule: "Está prohibido decir «sí» o «no». La gracia es hacer preguntas tramposas para que el otro caiga." },
    { name: "Dar y no recibir", rule: "Hay que lograr que el otro reciba algo de tu mano. Quien lo recibe, pierde; por eso todos andan con las manos escondidas." },
    { name: "Tres pies", rule: "Hay que meter un pie entre los dos pies del otro sin que se dé cuenta y decir «¡tres pies!». Requiere paciencia y disimulo." },
    { name: "Hablar y no contestar", rule: "Uno de los dos no puede responder nada de lo que el otro le diga, pase lo que pase." },
    { name: "Estatua", rule: "Cuando el otro grita «¡estatua!», hay que quedarse inmóvil en la posición en que se esté hasta que te liberen." },
];

// Textos de los escenarios (español). Estructura por id: ver src/scenario.js.
// Nombres de personas y empresas ficticias no se traducen.
export default {
 "sev": {
  "disaster": "Desastre",
  "high": "Alta",
  "average": "Promedio",
  "warning": "Advertencia",
  "info": "Información",
  "ok": "OK"
 },
 "esc": {
  "nadie": "No escalar: se resuelve en el turno",
  "jefe": "Jefe de turno",
  "clima": "Facilities · Climatización",
  "elec": "Facilities · Eléctrico",
  "proveedor": "Proveedor del equipo (soporte de hardware)",
  "cliente": "Cliente (NOC o contacto técnico)",
  "seguridad": "Seguridad física"
 },
 "cls": {
  "vp": {
   "label": "Verdadero positivo",
   "hint": "Hay un problema real que atender"
  },
  "fp": {
   "label": "Falso positivo",
   "hint": "La alerta no refleja lo que ocurre en sala"
  },
  "benigno": {
   "label": "Benigno",
   "hint": "Es real, pero esperado o autorizado"
  }
 },
 "prio": {
  "P1": "P1 · Crítica",
  "P2": "P2 · Alta",
  "P3": "P3 · Media",
  "P4": "P4 · Baja"
 },
 "models": {
  "server1": "Cumbre R110 · servidor 1U",
  "server2": "Cumbre R220 · servidor 2U",
  "storage": "Glaciar S400 · almacenamiento 4U (24 discos)",
  "switch": "Nodo SW-48 · switch 48 × 10 GbE",
  "firewall": "Muralla F1 · firewall perimetral",
  "router": "Paso R2 · router de borde 2U",
  "patch": "Panel de parcheo 24 × RJ45 Cat 6A"
 },
 "cal": {
  "CHG-1042": {
   "at": "08:00–10:00",
   "title": "Reemplazo de disco 3 en stg-02 (R07)",
   "who": "Austral Storage Services · técnico en sitio",
   "state": "Aprobado",
   "detail": "Cambio de disco en caliente (RAID 6). No requiere apagar el equipo. Ingreso de un técnico, acompañado."
  },
  "CHG-1045": {
   "at": "07:00–08:00",
   "title": "Instalación de nodo k8s-n7 en R06 (U23–U24)",
   "who": "Fintech Pehuén · personal del cliente",
   "state": "Ejecutado",
   "detail": "Montaje de un servidor 2U. Alimentación: PSU1 a PDU-A y PSU2 a PDU-B según plano de rack."
  },
  "MNT-221": {
   "at": "11:00–11:15",
   "title": "Autoprueba mensual de baterías UPS-A",
   "who": "Proveedor UPS (contrato de mantenimiento)",
   "state": "Programado",
   "detail": "Prueba automática de descarga corta. UPS-A opera en batería durante la prueba; la carga se mantiene protegida."
  },
  "CHG-1047": {
   "at": "Mañana 09:00",
   "title": "Actualización de firmware en sw-dist-01 (R10)",
   "who": "Logística Austral · NOC",
   "state": "Aprobado",
   "detail": "Ventana de mañana. No hay trabajo físico en sala."
  },
  "MNT-219": {
   "at": "Ayer 16:00",
   "title": "Limpieza de filtros CRAC-1 y CRAC-2",
   "who": "Facilities · Climatización",
   "state": "Cerrado",
   "detail": "Sin observaciones."
  }
 },
 "acc": {
  "acc-0728": {
   "who": "Javiera Soto (Fintech Pehuén)",
   "door": "Sala A",
   "note": "Cliente · CHG-1045"
  },
  "acc-0759": {
   "who": "Operador de turno (tú)",
   "door": "Sala A",
   "note": "Personal interno"
  },
  "acc-0805": {
   "who": "Matías Rivas (Austral Storage Services)",
   "door": "Sala A",
   "note": "Proveedor · CHG-1042"
  },
  "acc-0938": {
   "who": "Matías Rivas (Austral Storage Services)",
   "door": "Salida",
   "note": "Proveedor · fin de CHG-1042"
  },
  "acc-1102": {
   "who": "Paula Fuentes (Facilities)",
   "door": "Sala A",
   "note": "Personal interno · ronda"
  },
  "acc-1404": {
   "who": "Tarjeta de visita V-12",
   "door": "Sala A",
   "note": "Sin visita registrada para esta tarjeta"
  },
  "acc-1411": {
   "who": "Tarjeta de visita V-12",
   "door": "Salida",
   "note": "Sin visita registrada para esta tarjeta"
  }
 },
 "noise": {
  "n0": "Sincronización NTP correcta",
  "n22": "Respaldo nocturno completado (4,2 TB)",
  "n61": "Interfaz Gi1/0/24 arriba (cambio de enlace del cliente)",
  "n128": "Agente de monitoreo reiniciado por actualización",
  "n205": "Generador: prueba semanal sin carga OK",
  "n290": "Certificado TLS renovado",
  "n345": "Humedad relativa de la sala: 46 %",
  "n400": "Inicio de respaldo incremental"
 },
 "rb": {
  "RB-01": {
   "title": "Alarma de climatización (CRAC)",
   "steps": [
    "Confirmar la alarma en el equipo y en el monitoreo: ¿qué unidad falló y qué zona enfría?",
    "Si hay pérdida de capacidad, subir la capacidad de las unidades que siguen funcionando.",
    "Escalar de inmediato a Climatización y al jefe de turno. Las alarmas de compresor (alta presión) requieren técnico: no rearmar repetidamente.",
    "Mantener la contención (puertas del pasillo frío cerradas) y vigilar la temperatura de entrada cada 5 minutos.",
    "Avisar a los clientes afectados si la entrada supera 27 °C, el límite recomendado por ASHRAE."
   ]
  },
  "RB-02": {
   "title": "Carga de PDU y redundancia A+B",
   "steps": [
    "Comparar la carga de las ramas A y B del rack: deberían estar parejas.",
    "Revisar en sala qué fuente (PSU) de cada equipo está conectada a qué PDU.",
    "Si un equipo tiene ambas fuentes en la misma rama, perdió la redundancia.",
    "Los equipos son del cliente: informar y coordinar la corrección con su autorización. No desconectar por cuenta propia.",
    "Monitorear la rama hasta corregir. Sobre el 80 % de la capacidad hay riesgo de disparo del interruptor."
   ]
  },
  "RB-03": {
   "title": "Acceso y seguridad física",
   "steps": [
    "Contrastar el evento con el registro de accesos y los cambios aprobados.",
    "Si no hay trabajo autorizado, tratarlo como incidente de seguridad: avisar a Seguridad física y al jefe de turno.",
    "No manipular equipos ni retirar elementos encontrados: preservar la evidencia.",
    "Fotografiar y registrar el estado antes de asegurar la puerta."
   ]
  },
  "RB-04": {
   "title": "Detección de líquido bajo el piso técnico",
   "steps": [
    "Ubicar la zona del sensor e inspeccionar levantando la baldosa, sin pisar el agua.",
    "Identificar el origen (condensado, cañería, filtración) y su distancia a la canalización eléctrica.",
    "Contener con material absorbente y escalar a Climatización o mantención según el origen.",
    "No cortar la energía de la sala ni apagar la climatización sin evaluación: el remedio puede ser peor."
   ]
  },
  "RB-05": {
   "title": "Verificación de alertas de temperatura",
   "steps": [
    "Comparar el sensor con los vecinos y con las temperaturas internas de los servidores (IPMI).",
    "Revisar en sala la posición del sensor: debe medir en la toma de aire frontal.",
    "Buscar causas físicas comunes: paneles ciegos faltantes, cables que bloquean el flujo, baldosas mal ubicadas.",
    "Corregir la causa antes de tocar los setpoints de los CRAC."
   ]
  },
  "RB-06": {
   "title": "Trabajos de terceros y mantenimientos",
   "steps": [
    "Todo ingreso de terceros debe tener un cambio aprobado y vigente.",
    "Acompañar al técnico mientras trabaja en equipos de clientes.",
    "Las pruebas programadas (UPS, generador) se verifican contra el calendario y se registran; no se interrumpen.",
    "Registrar inicio y fin de cada trabajo en la bitácora."
   ]
  }
 },
 "fa": {
  "tech-escort": {
   "label": "Acompañar al técnico",
   "verb": "Acompañando al técnico"
  },
  "stg02-off": {
   "label": "Apagar stg-02",
   "verb": "Apagando stg-02",
   "authWhy": "Pediste autorización al cliente para apagar stg-02. Preguntar antes de intervenir un equipo de un cliente es la actitud correcta, y por eso el juego lo registra como escalamiento al cliente. Aquí descuenta porque apagar stg-02 no era necesario: CHG-1042 estaba aprobado y el cambio de disco es en caliente, así que no había nada que pedirle al cliente. Antes de solicitar una intervención, pregúntate si hace falta."
  },
  "sensor-fix": {
   "label": "Reubicar y fijar el sensor de entrada",
   "verb": "Reubicando el sensor"
  },
  "r04-hosts-off": {
   "label": "Apagar los hosts de virtualización de R04",
   "verb": "Apagando los hosts de R04",
   "authWhy": "Pediste autorización al cliente para apagar los hosts de R04. Preguntar antes de tocar equipos de un cliente está bien, y por eso cuenta como escalamiento al cliente; aquí descuenta porque no había un problema térmico real: era un sensor suelto. Antes de solicitar una intervención, confirma que el problema existe."
  },
  "crac-100": {
   "label": "Llevar CRAC-1 y CRAC-2 al 100 %",
   "verb": "Ajustando los CRAC"
  },
  "blank-install": {
   "label": "Instalar paneles ciegos en U30–U34",
   "verb": "Instalando paneles ciegos"
  },
  "setpoint-16": {
   "label": "Bajar el setpoint de ambos CRAC a 16 °C",
   "verb": "Cambiando el setpoint"
  },
  "aisle-open": {
   "label": "Abrir la puerta del pasillo frío",
   "verb": "Abriendo el pasillo frío"
  },
  "psu-move": {
   "label": "Mover la PSU1 de k8s-n7 a PDU-A",
   "verb": "Moviendo la PSU1 a PDU-A"
  },
  "n7-off": {
   "label": "Apagar k8s-n7",
   "verb": "Apagando k8s-n7"
  },
  "ups-bypass": {
   "label": "Pasar UPS-A a bypass",
   "verb": "Pasando UPS-A a bypass"
  },
  "crac1-boost": {
   "label": "Subir la capacidad de CRAC-1 al 90 %",
   "verb": "Subiendo la capacidad de CRAC-1"
  },
  "crac2-reset": {
   "label": "Rearmar el compresor de CRAC-2",
   "verb": "Rearmando CRAC-2"
  },
  "tile-lift": {
   "label": "Levantar la baldosa e inspeccionar",
   "verb": "Levantando la baldosa"
  },
  "absorbent": {
   "label": "Colocar material absorbente",
   "verb": "Colocando material absorbente"
  },
  "photo-leak": {
   "label": "Fotografiar",
   "verb": "Fotografiando",
   "photo": "Foto · agua bajo la baldosa, zona 3"
  },
  "crac1-off": {
   "label": "Apagar CRAC-1",
   "verb": "Apagando CRAC-1"
  },
  "photo-r02": {
   "label": "Fotografiar",
   "verb": "Fotografiando",
   "photo": "Foto · puerta trasera de R02 y cable de consola"
  },
  "door-secure": {
   "label": "Asegurar la puerta trasera",
   "verb": "Asegurando la puerta"
  },
  "cable-unplug": {
   "label": "Desconectar el cable de consola de fw-01",
   "verb": "Desconectando el cable"
  },
  "trash-remove": {
   "label": "Retirar el embalaje del pasillo",
   "verb": "Retirando el embalaje"
  },
  "fw01-reboot": {
   "label": "Reiniciar fw-01",
   "verb": "Reiniciando fw-01"
  }
 },
 "round": {
  "temp": {
   "title": "Temperatura de entrada en ambas filas",
   "where": "Un rack de la fila A y uno de la fila B.",
   "why": "Revisa la temperatura de entrada de un rack de cada fila: según ASHRAE debe estar entre 18 y 27 °C. Es el primer indicador de que la climatización llega a todos los equipos.",
   "finding": "Ambas filas están entre 21 y 23 °C: dentro del rango recomendado.",
   "ref": "ASHRAE TC 9.9"
  },
  "crac": {
   "title": "Climatización (CRAC)",
   "where": "CRAC-1 y CRAC-2.",
   "why": "Comprueba que los dos CRAC estén operando sin alarmas y mira su estado físico: bandejas de condensado, drenajes y filtros. Un problema menor hoy puede ser una falla o una fuga mañana.",
   "finding": "La bandeja de condensado de CRAC-1 está casi llena y el drenaje corre lento: es una observación para Climatización antes de que se convierta en una fuga.",
   "ref": "ASHRAE TC 9.9 · mantenimiento de climatización"
  },
  "ups": {
   "title": "UPS y energía de la sala",
   "where": "UPS-A y UPS-B.",
   "why": "Revisa que ambas UPS estén en línea, sin alarmas, con la batería cargada y una autonomía razonable. Son el respaldo de toda la sala ante un corte de red.",
   "finding": "Ambas UPS en línea, sin alarmas y con la batería al 100 %.",
   "ref": "IEEE 1188 · Uptime Institute Tiers"
  },
  "ab": {
   "title": "Redundancia A/B de las fuentes",
   "where": "Los racks con equipos instalados recientemente (revisa el calendario de cambios).",
   "why": "Cada equipo debe tener una fuente en la rama A y otra en la B. Revisa sobre todo los equipos instalados hace poco: el calendario de cambios te dice cuáles son.",
   "finding": "k8s-n7 (instalado hoy con CHG-1045) tiene las dos fuentes en PDU-B: perdió la redundancia. Como es un equipo del cliente, se corrige con su autorización.",
   "ref": "ANSI/TIA-942 · Uptime Institute Tiers"
  },
  "blank": {
   "title": "Paneles ciegos",
   "where": "El frente de los racks con U libres.",
   "why": "Las U libres del frente deben estar tapadas con paneles ciegos; si no, el aire caliente de atrás vuelve al frente y calienta los equipos. Revisa los racks que tienen espacios vacíos.",
   "finding": "En R08 faltan paneles ciegos entre U30 y U34: provocarán recirculación de aire caliente durante el turno.",
   "ref": "ASHRAE TC 9.9 · EU Code of Conduct"
  },
  "doors": {
   "title": "Puertas y cerraduras de los racks",
   "where": "Las puertas traseras de un rack de cada fila.",
   "why": "Las puertas de los racks deben estar cerradas y con llave: es un control físico básico que protege los equipos de los clientes.",
   "finding": "Todas las puertas cerradas al inicio del turno.",
   "ref": "ISO/IEC 27001:2022 A.7"
  },
  "fire": {
   "title": "Detección y extinción de incendios",
   "where": "El panel junto a la puerta de la sala (lector de acceso).",
   "why": "Verifica que el sistema de detección temprana de humo (VESDA) no tenga alarmas y que los extintores estén en su lugar, con la carga vigente.",
   "finding": "El extintor de CO₂ junto a la puerta tiene la carga vencida desde 09/2026: hay que pedir su recarga.",
   "ref": "NFPA 75 · NFPA 76"
  },
  "clean": {
   "title": "Orden y limpieza",
   "where": "Los pasillos, sobre todo donde se instaló algo hace poco.",
   "why": "La sala debe estar libre de cartón y embalajes: generan polvo, son combustibles y pueden obstruir el flujo de aire.",
   "finding": "Quedó una caja de embalaje del equipo instalado hoy junto a R06, en el pasillo caliente.",
   "ref": "ANSI/TIA-942 · buenas prácticas de operación"
  },
  "access": {
   "title": "Control de acceso",
   "where": "El registro de accesos (pestaña Accesos).",
   "why": "Revisa los ingresos de la noche y del inicio del turno: cada uno debe tener un motivo (un cambio, una visita registrada o personal interno).",
   "finding": "Los ingresos de las 07:28 y 07:59 tienen motivo: el cambio CHG-1045 y el operador de turno.",
   "ref": "ISO/IEC 27001:2022 A.7"
  },
  "floor": {
   "title": "Piso técnico y detección de fugas",
   "where": "La zona del sensor de fugas, junto a CRAC-1.",
   "why": "Revisa que el sensor de fugas no tenga alarmas y que el piso técnico esté seco y con las baldosas en su lugar.",
   "finding": "El sensor de fugas está normal y el piso técnico seco.",
   "ref": "ANSI/TIA-942"
  }
 },
 "tut": [
  "Este es el reloj del turno. Pulsa ▶ para que avance; ⏭ adelanta al siguiente evento. En Guiado, el reloj espera mientras tengas un ticket abierto.",
  "Esta es la sala. Haz clic en un rack (prueba con R01): en el inspector verás lecturas, observaciones que puedes adjuntar como evidencia (📎) y acciones que puedes hacer en la sala.",
  "Las palabras con subrayado punteado tienen definición: pasa el mouse o toca una (por ejemplo, IPMI). Todas están en Consulta → Glosario.",
  "El botón ? repite las instrucciones. Cuando llegue el primer evento, un tutor te acompañará paso a paso."
 ],
 "inc": {
  "E1": {
   "title": "Ingreso de proveedor a la sala",
   "alert": "Ingreso a Sala A con credencial de proveedor externo (P-0412)",
   "why": "El ingreso coincide con CHG-1042, aprobado para hoy de 08:00 a 10:00 sobre stg-02 (R07). Es trabajo autorizado: se verifica, se acompaña y se registra. El cambio de disco es en caliente; el operador no apaga ni manipula equipos del cliente.",
   "ref": "RB-06 · Gestión de cambios (ITIL / ISO/IEC 20000-1)",
   "actions": {
    "a1": "Verificar que el ingreso tenga un cambio aprobado y vigente",
    "a2": "Acompañar al técnico mientras trabaja en el rack del cliente",
    "a3": "Registrar el ingreso y la salida en la bitácora",
    "a4": "Bloquear la credencial y pedir al técnico que salga de la sala",
    "a5": "Apagar stg-02 para que el técnico trabaje sin riesgo"
   },
   "hints": [
    "Un proveedor en la sala no siempre es un problema. ¿Qué documento autoriza que alguien trabaje en la sala?",
    "Busca en la pestaña Cambios un trabajo de hoy sobre stg-02, en R07, y compáralo con el registro de Accesos.",
    "CHG-1042 está aprobado de 08:00 a 10:00: es trabajo autorizado. Se verifica, se acompaña al técnico en R07 y se registra; no se escala ni se apagan equipos."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Mira quién entró y cuándo",
     "text": "Un proveedor en la sala no siempre es un problema. Revisa la pestaña Accesos y adjunta (📎) el ingreso de las 08:05."
    },
    {
     "label": "Busca si hay un cambio aprobado",
     "text": "Todo trabajo en sala debe tener un cambio aprobado y vigente. Revisa la pestaña Cambios y adjunta el que corresponde."
    },
    {
     "label": "Ve al rack donde trabaja",
     "text": "CHG-1042 dice «stg-02 (R07)». Haz clic en R07."
    },
    {
     "label": "Acompaña al técnico",
     "text": "En el inspector de R07 tienes acciones. Elige la que corresponde mientras el técnico trabaja."
    },
    {
     "label": "Registra en la bitácora",
     "text": "Escribe en la bitácora qué pasó y menciona el ticket (por ejemplo «TK-101»). También sirve la nota del cierre."
    },
    {
     "label": "Cierra el ticket",
     "text": "Ya tienes lo necesario. Pulsa «Resolver y cerrar ticket»."
    }
   ],
   "reflect": {
    "q": "¿Qué hace que este ingreso sea benigno y no un incidente de seguridad?",
    "options": [
     {
      "t": "El técnico llevaba credencial de proveedor.",
      "fb": "La credencial solo dice quién es; lo que autoriza el trabajo es el cambio aprobado."
     },
     {
      "t": "Coincide con un cambio aprobado y vigente sobre ese mismo equipo.",
      "fb": "Exacto: CHG-1042 autoriza el trabajo en stg-02 de 08:00 a 10:00. Por eso se acompaña y se registra, sin escalar."
     },
     {
      "t": "Ocurrió en horario hábil.",
      "fb": "El horario no autoriza un ingreso: sin un cambio aprobado, sería un incidente aunque fuera de día."
     }
    ]
   }
  },
  "E2": {
   "title": "Temperatura alta en R04",
   "alert": "Temperatura de entrada alta en R04 (sensor superior): 34,2 °C",
   "why": "Un solo sensor marca 34 °C, mientras R03 y R05 están cerca de 22 °C, la salida de R04 es normal y los servidores reportan 22–24 °C por IPMI. El sensor estaba suelto y colgaba hacia la parte trasera, donde sale el aire caliente. Es una medición errónea, no un problema térmico: se corrige el sensor sin escalar. La temperatura de entrada se mide en la toma de aire frontal.",
   "ref": "RB-05 · ASHRAE TC 9.9 (puntos de medición en la entrada)",
   "actions": {
    "a1": "Contrastar con los sensores vecinos y con la temperatura IPMI de los servidores",
    "a2": "Reubicar y fijar el sensor en la toma de aire frontal del rack",
    "a3": "Dejar registro para que mantenimiento revise la fijación del sensor",
    "a4": "Subir CRAC-1 y CRAC-2 al 100 % para bajar la temperatura",
    "a5": "Apagar los hosts de virtualización de R04 para evitar daños"
   },
   "hints": [
    "Antes de reaccionar a una lectura, pregúntate si el resto de la información la confirma.",
    "Compara el sensor con R03 y R05, con la salida de R04 y con la temperatura IPMI de los servidores. Luego mira dónde está el sensor.",
    "El sensor está suelto y mide el aire caliente de atrás: es un falso positivo. Reubícalo y fíjalo en la toma frontal, deja registro y no escales."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Revisa R04 en la sala",
     "text": "Haz clic en R04. Compara el sensor superior con las demás lecturas y con la temperatura IPMI de los servidores."
    },
    {
     "label": "Adjunta lo que contradice la alerta",
     "text": "Adjunta (📎) la observación de IPMI y la del sensor suelto."
    },
    {
     "label": "Corrige el sensor",
     "text": "En las acciones de R04, reubica y fija el sensor en la toma de aire frontal."
    },
    {
     "label": "Deja registro",
     "text": "Escribe una nota que mencione el ticket para que mantenimiento revise la fijación (o usa la nota del cierre)."
    },
    {
     "label": "Cierra el ticket",
     "text": "Piensa en la clasificación: ¿la alerta reflejaba lo que pasaba en la sala?"
    }
   ],
   "reflect": {
    "q": "¿Por qué esta alerta es un falso positivo?",
    "options": [
     {
      "t": "Porque 34 °C está dentro del rango recomendado.",
      "fb": "No: 34 °C está muy sobre el rango recomendado (18–27 °C). El punto es que esa lectura no era real."
     },
     {
      "t": "Porque las demás mediciones no la confirman y el sensor estaba mal ubicado.",
      "fb": "Exacto: una lectura aislada, que nada confirma y con una causa física a la vista, es un falso positivo."
     },
     {
      "t": "Porque las alertas de un solo sensor siempre son falsas.",
      "fb": "No siempre: un solo sensor puede detectar un problema real. Lo que decide es contrastarlo con otras fuentes."
     }
    ]
   }
  },
  "E3": {
   "title": "Temperatura en aumento en R08",
   "alert": "Temperatura de entrada en aumento en R08 (sensor superior): 26,1 °C",
   "why": "Faltan paneles ciegos entre U30 y U34. El aire caliente de la parte trasera vuelve al frente por el hueco (recirculación) y calienta la entrada de los equipos superiores. Se corrige en sala, sin escalar: paneles ciegos y verificación. Bajar el setpoint gasta energía y no resuelve la causa; abrir el pasillo frío rompe la contención.",
   "ref": "RB-05 · ASHRAE TC 9.9 · EU Code of Conduct for Data Centres (gestión de flujo de aire)",
   "actions": {
    "a1": "Instalar paneles ciegos en los espacios vacíos U30–U34",
    "a2": "Verificar después que la temperatura de entrada vuelva a rango",
    "a3": "Registrar el hallazgo en la bitácora",
    "a4": "Bajar el setpoint de ambos CRAC a 16 °C",
    "a5": "Abrir la puerta del pasillo frío para ventilar"
   },
   "hints": [
    "La temperatura sube solo en la parte superior de R08. ¿Qué podría dejar pasar aire caliente hacia el frente?",
    "Mira el frente de R08 entre U30 y U34. El aire caliente de la parte trasera vuelve por los huecos.",
    "Faltan paneles ciegos en U30–U34. Instálalos desde el inspector de R08, verifica después la temperatura y registra el hallazgo. No toques los setpoints ni abras el pasillo frío."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Mira el frente de R08",
     "text": "Haz clic en R08. La temperatura sube solo arriba: busca por dónde podría volver el aire caliente."
    },
    {
     "label": "Adjunta el hallazgo",
     "text": "Adjunta (📎) la observación de los paneles ciegos faltantes y la de la recirculación."
    },
    {
     "label": "Corrige la causa",
     "text": "En las acciones de R08, instala los paneles ciegos en U30–U34."
    },
    {
     "label": "Verifica la temperatura",
     "text": "Vuelve a revisar R08 después de instalar los paneles."
    },
    {
     "label": "Registra en la bitácora",
     "text": "Deja una nota que mencione el ticket (o usa la nota del cierre)."
    },
    {
     "label": "Cierra el ticket",
     "text": "Pulsa «Resolver y cerrar ticket»."
    }
   ],
   "reflect": {
    "q": "¿Por qué instalar paneles ciegos en vez de bajar el setpoint de los CRAC?",
    "options": [
     {
      "t": "Porque bajar el setpoint está prohibido por norma.",
      "fb": "No hay una prohibición: simplemente no corrige la causa y gasta más energía."
     },
     {
      "t": "Porque la causa es la recirculación por el hueco: el panel la corrige y el setpoint solo enfría más todo.",
      "fb": "Así es: se corrige la causa física. Tocar el setpoint gasta energía y deja el problema."
     },
     {
      "t": "Porque los paneles ciegos son más baratos.",
      "fb": "El costo no es la razón: el problema es de flujo de aire, no de capacidad de frío."
     }
    ]
   }
  },
  "E4": {
   "title": "Carga alta en PDU-B de R06",
   "alert": "PDU-B de R06 sobre el umbral: 84 % de la capacidad de la rama",
   "why": "k8s-n7, instalado hoy por el cliente (CHG-1045), tiene las dos fuentes conectadas a PDU-B. La rama B sube y el equipo perdió la redundancia A+B: si la rama dispara, el nodo cae y los demás quedan sin respaldo. Como es un equipo del cliente, el operador no lo desconecta por su cuenta: informa, propone la corrección y la ejecuta con autorización. El cambio indicaba «PSU1 a PDU-A y PSU2 a PDU-B»: es un error de instalación.",
   "ref": "RB-02 · TIA-942 / Uptime Institute Tiers (alimentación redundante)",
   "actions": {
    "a1": "Revisar en sala a qué PDU está conectada cada fuente de los equipos de R06",
    "a2": "Informar al cliente y, con su autorización, mover una fuente de k8s-n7 a PDU-A",
    "a3": "Monitorear la carga de PDU-B hasta la corrección",
    "a4": "Desconectar de inmediato la PSU1 de k8s-n7 y pasarla a PDU-A sin avisar",
    "a5": "Subir el umbral de alerta de la PDU al 95 %",
    "a6": "Apagar k8s-n7 hasta que el cliente revise"
   },
   "hints": [
    "Una rama de PDU muy cargada y la otra liviana suele indicar un problema de conexión, no de consumo.",
    "Revisa en la ficha de R06 (o de k8s-n7) a qué PDU va cada fuente. Mira también el cambio CHG-1045.",
    "k8s-n7 tiene las dos fuentes en PDU-B. Es un equipo del cliente: solicita su autorización y, cuando la tengas, mueve la PSU1 a PDU-A. Sin autorización no se toca."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Revisa las fuentes de R06",
     "text": "Haz clic en R06 (o en la ficha de k8s-n7) y mira a qué PDU va cada fuente."
    },
    {
     "label": "Adjunta lo que encontraste",
     "text": "Adjunta (📎) la observación de las fuentes de k8s-n7 y la lectura de las PDU."
    },
    {
     "label": "Revisa el cambio que instaló el equipo",
     "text": "En la pestaña Cambios, busca cómo debía conectarse k8s-n7 y adjunta ese cambio."
    },
    {
     "label": "Pide autorización al cliente",
     "text": "k8s-n7 es un equipo del cliente. En sus acciones, pulsa «Solicitar autorización al cliente»."
    },
    {
     "label": "Mueve la PSU1 a PDU-A",
     "text": "Cuando el cliente autorice, mueve la PSU1 a PDU-A desde las acciones de R06 o de k8s-n7."
    },
    {
     "label": "Cierra el ticket",
     "text": "Pulsa «Resolver y cerrar ticket»."
    }
   ],
   "reflect": {
    "q": "¿Por qué no mover la fuente apenas detectas el problema?",
    "options": [
     {
      "t": "Porque mover una fuente siempre apaga el equipo.",
      "fb": "No necesariamente. La razón es otra: el equipo es del cliente."
     },
     {
      "t": "Porque es un equipo del cliente: se informa y se actúa con su autorización.",
      "fb": "Correcto: en un colocation el operador no interviene equipos de clientes sin autorización, aunque sepa cómo corregirlo."
     },
     {
      "t": "Porque la carga de PDU-B todavía es baja.",
      "fb": "No: 84 % ya es alto y sigue subiendo. Hay que actuar, pero con autorización."
     }
    ]
   }
  },
  "E5": {
   "title": "UPS-A en batería",
   "alert": "UPS-A operando en batería",
   "why": "MNT-221 programó la autoprueba mensual de baterías de UPS-A de 11:00 a 11:15. La entrada de red está normal y UPS-B opera sin novedad. Pasar a bypass dejaría la carga sin protección; arrancar el generador o avisar un corte que no existe solo genera ruido. Se verifica contra el calendario y se registra.",
   "ref": "RB-06 · IEEE 1188 (mantenimiento de baterías)",
   "actions": {
    "a1": "Confirmar en el calendario la autoprueba programada (MNT-221)",
    "a2": "Verificar que la entrada de red y UPS-B estén normales",
    "a3": "Registrar inicio y fin de la prueba en la bitácora",
    "a4": "Arrancar el generador manualmente por precaución",
    "a5": "Pasar UPS-A a bypass para cortar la prueba",
    "a6": "Avisar a todos los clientes de un corte de energía"
   },
   "hints": [
    "¿Hay algo programado para esta hora que explique que la UPS esté en batería?",
    "Revisa la pestaña Cambios y la pantalla de UPS-A. Compara con UPS-B y la entrada de red.",
    "Es la autoprueba mensual MNT-221 (11:00–11:15). Verifica red y UPS-B, registra inicio y fin, y no interrumpas la prueba. No se escala."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Busca si la prueba estaba programada",
     "text": "Revisa la pestaña Cambios y adjunta el mantenimiento que explica lo que pasa."
    },
    {
     "label": "Mira la pantalla de UPS-A",
     "text": "Haz clic en UPS-A y adjunta lo que dice su pantalla."
    },
    {
     "label": "Verifica UPS-B",
     "text": "Haz clic en UPS-B para confirmar que opera normal."
    },
    {
     "label": "Registra en la bitácora",
     "text": "Deja una nota que mencione el ticket (o usa la nota del cierre)."
    },
    {
     "label": "Cierra el ticket",
     "text": "Pulsa «Resolver y cerrar ticket»."
    }
   ],
   "reflect": {
    "q": "¿Qué hace que una UPS en batería sea benigna en este caso?",
    "options": [
     {
      "t": "Que la batería esté sobre 90 %.",
      "fb": "La carga de la batería no decide: lo que decide es que la prueba estaba programada y la red está normal."
     },
     {
      "t": "Que sea la autoprueba programada MNT-221, con la red y UPS-B normales.",
      "fb": "Exacto: es un evento real, esperado y autorizado."
     },
     {
      "t": "Que dure menos de 15 minutos.",
      "fb": "La duración ayuda, pero sin el mantenimiento programado no sabrías que es una prueba."
     }
    ]
   }
  },
  "E6": {
   "title": "Falla de CRAC-2",
   "alert": "CRAC-2: falla de compresor (alarma de alta presión HP1)",
   "why": "Con CRAC-2 detenido, la fila B pierde aire frío y la temperatura sube minuto a minuto: es crítico y se escala de inmediato a Climatización y al jefe de turno. Mientras llega el técnico, se compensa con CRAC-1 y se vigila la entrada de la fila B. Una alarma de alta presión no se rearma a la fuerza: insistir puede dañar el compresor.",
   "ref": "RB-01 · ASHRAE TC 9.9 (rango recomendado 18–27 °C)",
   "actions": {
    "a1": "Subir la capacidad de CRAC-1 para compensar",
    "a2": "Vigilar la temperatura de entrada de la fila B cada 5 minutos",
    "a3": "Mantener cerradas las puertas del pasillo frío",
    "a4": "Rearmar CRAC-2 varias veces hasta que el compresor arranque",
    "a5": "Abrir las puertas del pasillo frío y de la sala para ventilar",
    "a6": "Esperar a ver si la temperatura se estabiliza sola"
   },
   "hints": [
    "Una falla de climatización empeora minuto a minuto: piensa primero en contener el daño y en quién debe repararla.",
    "Revisa CRAC-2 (qué alarma tiene) y CRAC-1 (qué margen de capacidad le queda). Mira el runbook RB-01.",
    "Sube la capacidad de CRAC-1, mantén cerrado el pasillo frío, vigila la fila B y escala de inmediato a Climatización y al jefe de turno. No rearmes CRAC-2."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Es una falla crítica: ábrelo de inmediato."
    },
    {
     "label": "Mira la alarma de CRAC-2",
     "text": "Haz clic en CRAC-2 y adjunta la alarma que muestra."
    },
    {
     "label": "Revisa el margen de CRAC-1",
     "text": "Haz clic en CRAC-1 y adjunta cuánta capacidad le queda."
    },
    {
     "label": "Compensa con CRAC-1",
     "text": "En las acciones de CRAC-1, sube su capacidad."
    },
    {
     "label": "Cierra y escala",
     "text": "Al cerrar, piensa a quién hay que avisar para que repare CRAC-2."
    }
   ],
   "reflect": {
    "q": "¿Por qué no rearmar CRAC-2 hasta que arranque?",
    "options": [
     {
      "t": "Porque el rearme solo se hace de noche.",
      "fb": "No tiene que ver con el horario."
     },
     {
      "t": "Porque una alarma de alta presión indica una falla que necesita un técnico; insistir puede dañar el compresor.",
      "fb": "Así es: se compensa con CRAC-1, se vigila la fila B y se escala."
     },
     {
      "t": "Porque CRAC-1 basta para toda la sala.",
      "fb": "CRAC-1 ayuda a compensar, pero no reemplaza a CRAC-2: la fila B sigue en riesgo hasta la reparación."
     }
    ]
   }
  },
  "E7": {
   "title": "Líquido bajo el piso técnico",
   "alert": "Detección de líquido bajo el piso técnico · Zona 3 (junto a CRAC-1)",
   "why": "El agua viene de la bandeja de condensado de CRAC-1 y está a 40 cm de la canalización eléctrica. Hay que contener y escalar a Climatización. Apagar CRAC-1 o cortar la energía de la sala provocaría un incidente mucho mayor que la fuga.",
   "ref": "RB-04 · TIA-942 (detección de fugas)",
   "actions": {
    "a1": "Levantar la baldosa e inspeccionar el origen sin pisar el agua",
    "a2": "Contener con material absorbente y alejar el agua de la canalización eléctrica",
    "a3": "Documentar con fotos el punto exacto y el origen",
    "a4": "Apagar CRAC-1 de inmediato",
    "a5": "Esperar al cambio de turno; es poca agua",
    "a6": "Cortar la energía del tablero de la sala"
   },
   "hints": [
    "Con agua bajo el piso, lo primero es saber de dónde viene y qué tan cerca está de la energía.",
    "Levanta la baldosa de la zona 3 para ver el origen. Revisa el runbook RB-04.",
    "Levanta la baldosa, contén el agua con material absorbente, toma una foto y escala a Climatización. No apagues CRAC-1 ni cortes la energía."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Levanta la baldosa",
     "text": "Haz clic en la zona del sensor de fuga y, en sus acciones, levanta la baldosa para ver el origen."
    },
    {
     "label": "Adjunta el origen y el riesgo",
     "text": "Adjunta (📎) de dónde viene el agua y qué tan cerca está de la canalización eléctrica."
    },
    {
     "label": "Contén el agua",
     "text": "Coloca material absorbente para que el agua no avance."
    },
    {
     "label": "Documenta con una foto",
     "text": "Fotografía el punto exacto y el origen."
    },
    {
     "label": "Cierra y escala",
     "text": "Al cerrar, piensa quién debe reparar el origen de la fuga."
    }
   ],
   "reflect": {
    "q": "¿Por qué no cortar la energía de la sala si hay agua cerca de la canalización?",
    "options": [
     {
      "t": "Porque cortar la energía es solo para incendios.",
      "fb": "No es por eso: cortar la energía puede justificarse en otras emergencias, pero aquí el riesgo se controla conteniendo."
     },
     {
      "t": "Porque se puede contener el agua sin afectar el servicio; cortar la energía causaría un incidente mucho mayor.",
      "fb": "Correcto: el remedio no debe ser peor que el problema."
     },
     {
      "t": "Porque el agua no conduce electricidad.",
      "fb": "Sí conduce: por eso hay que contenerla y alejarla de la canalización."
     }
    ]
   }
  },
  "E8": {
   "title": "Puerta de R02 abierta",
   "alert": "Puerta trasera de R02 abierta sin trabajo programado",
   "why": "La puerta se abrió sin cambio asociado, y a las 14:04 entró una tarjeta de visita (V-12) sin visita registrada. Hay un cable de consola conectado a fw-01 que no figura en el inventario. Es un posible acceso no autorizado: se avisa a Seguridad física y al jefe de turno, se preserva la evidencia y no se toca el equipo del cliente.",
   "ref": "RB-03 · ISO/IEC 27001:2022 A.7 (controles físicos)",
   "actions": {
    "a1": "No manipular el equipo ni el cable encontrado: preservar la evidencia",
    "a2": "Revisar el registro de accesos y las cámaras del periodo",
    "a3": "Fotografiar, registrar y luego asegurar la puerta",
    "a4": "Desconectar el cable de consola de fw-01",
    "a5": "Cerrar la puerta y cerrar el ticket",
    "a6": "Reiniciar fw-01 por si fue manipulado"
   },
   "hints": [
    "Una puerta abierta sin trabajo programado puede ser un acceso no autorizado: lo que encuentres es evidencia.",
    "Revisa el registro de Accesos alrededor de las 14:04 y mira la parte trasera de R02 sin tocar nada.",
    "Fotografía la puerta y el cable, revisa Accesos, asegura la puerta después de fotografiar y escala a Seguridad física y al jefe de turno. No desconectes el cable ni reinicies fw-01."
   ],
   "steps": [
    {
     "label": "Abre el ticket",
     "text": "Haz clic en el aviso o en la pestaña Tickets."
    },
    {
     "label": "Mira R02 sin tocar nada",
     "text": "Haz clic en R02 y adjunta (📎) lo que ves en la puerta y en fw-01."
    },
    {
     "label": "Revisa quién entró",
     "text": "En la pestaña Accesos, busca el ingreso de las 14:04 y adjúntalo."
    },
    {
     "label": "Fotografía antes de tocar",
     "text": "En las acciones de R02, toma una foto de la puerta y del cable."
    },
    {
     "label": "Asegura la puerta",
     "text": "Después de la foto, asegura la puerta trasera."
    },
    {
     "label": "Cierra y escala",
     "text": "Al cerrar, piensa a quién le corresponde investigar un posible acceso no autorizado."
    }
   ],
   "reflect": {
    "q": "¿Por qué no desconectar el cable de consola de fw-01?",
    "options": [
     {
      "t": "Porque el cable es del cliente.",
      "fb": "Puede ser, pero la razón principal es otra: el cable es evidencia."
     },
     {
      "t": "Porque es evidencia de un posible acceso no autorizado: se fotografía y se deja para Seguridad.",
      "fb": "Exacto: preservar la evidencia permite investigar qué pasó."
     },
     {
      "t": "Porque desconectarlo reinicia el firewall.",
      "fb": "No lo reinicia, pero alteraría la evidencia de un posible acceso no autorizado."
     }
    ]
   }
  }
 }
};

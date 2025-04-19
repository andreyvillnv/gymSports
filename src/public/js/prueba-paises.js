// const paises = {
//   p:{ "Costa Rica": {
//     "San Jose": {
//       "Tarrazú": [
//         "San Marcos", 
//         "San Lorenzo"
//     ],
//       "León Cortes": ["San Pablo"],
//     },
//     'Alajuela': {
//       'Upala': [
//         "Aguas Claras",
//         "San José"
//     ],
//     },
//   },
//   'Colombia': {
//     'Antioquía': {
//       'Medellín': [
//         "San Antonio de Prado",
//         "Santa Elena",
//         "San Cristóbal",
//         "Altavista",
//       ],
//       'Bello': [
//         "San Roque",
//         "San Juan",
//         "San Pedro"],
//     },
//   },}
// };
// console.log(paises.p["Costa Rica"]["San Jose"]);

import { abrirConexion } from "../../config-sql.js";

async function name() {
    try {
        const connect = await abrirConexion()
        const rows = await connect.query('select * from datospaises')
        return rows
    } catch (error) {
        console.log(error)
    }
}

const rows = name()
console.log(rows)
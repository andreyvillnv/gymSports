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
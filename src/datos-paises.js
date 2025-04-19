import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import { datosPaises } from "./querys-sql.js";

const dir_name = dirname(fileURLToPath(import.meta.url));

export async function datosDePaises() {
  try {
    const paises = await datosPaises();
    if (!paises || paises.length === 0) {
      throw new Error("No se pudo obtener datosDePaises");
    }
    const paisesJSON = {
      paises: paises,
    };
   
    // Asegurar que la carpeta public exista
    const carpetaPublic = join(dir_name, "public");
    if (!fs.existsSync(carpetaPublic)) {
      fs.mkdirSync(carpetaPublic, { recursive: true });
    }

    const rutaArchivo = join(carpetaPublic, "data-paises.json");
    fs.writeFileSync(rutaArchivo, JSON.stringify(paisesJSON, null, 2));

    //console.log('Archivo JSON guardado en:', rutaArchivo);
  } catch (error) {
    console.error("Error en datosDePaises:", error);
  }
}

export function leerdatosPaises() {
  try {
    const carpetaPublic = join(dir_name, "public");
    const rutaArchivo = join(carpetaPublic, "data-paises.json");
    
  } catch (error) {}
}


// const data = paises.paises
// const _paises = data.filter(e => e.descripcion.toLowerCase().trim() === 'pais' );
// const estados = data.filter(e => e.descripcion.toLowerCase().trim() === 'estado' && e.id_asociado.toLowerCase() === 'cr');
// const ciudades = data.filter(e => e.descripcion.toLowerCase().trim() === 'ciudad' && e.id_asociado.toLowerCase() === 'ca');

// console.log('Paises:');
// _paises.forEach(e => {
//   console.log(e.nombre, e.id);
// })
// console.log('******************');
// console.log('Estados:');
// estados.forEach(e => {
//   console.log(e.nombre, e.id);
// })

// console.log('******************');
// console.log('Ciudades:')
// ciudades.forEach(e => {
//   console.log(e.nombre);
// })


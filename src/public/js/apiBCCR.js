
// const qs = require("qs");
// const he = require("he");
// const xml2js = require("xml2js");
import axios from "axios";
import qs from 'qs'
import he from 'he'
import xml2js from 'xml2js'
function obtenerFechaFormato() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, "0"); // Agrega un 0 si es menor a 10
  const mes = String(hoy.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11
  const año = hoy.getFullYear();
  return `${dia}/${mes}/${año}`;
}

const url =
  "https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx";

const params = {
  FechaInicio: obtenerFechaFormato(),
  FechaFinal: obtenerFechaFormato(),
  Nombre: "Andrey",
  SubNiveles: "N",
  CorreoElectronico: "anvillalobosna@hotmail.com",
  Token: "E3A00CLESR",
};

async function compra() {
  const obtenerTipoCambio = async (codigoIndicador) => {
    const paramsConCodigo = { ...params, Indicador: codigoIndicador };
    try {
      const response = await axios.post(
        `${url}/ObtenerIndicadoresEconomicosXML`,
        qs.stringify(paramsConCodigo),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      let xml = response.data;
      let decodedXml = he.decode(xml);
      return decodedXml;
    } catch (error) {
      console.error(
        `Error al obtener tipo de cambio ${codigoIndicador}:`,
        error
      );
      return null;
    }
  };

  try {
    const [compraResponse] = await Promise.all([
      obtenerTipoCambio("317"), // Tipo de cambio de compra
    ]);
    return compraResponse;
  } catch (error) {
    console.error("Error en la función compra:", error);
    return null;
  }
}

async function venta() {
  const obtenerTipoCambio = async (codigoIndicador) => {
    const paramsConCodigo = { ...params, Indicador: codigoIndicador };
    try {
      const response = await axios.post(
        `${url}/ObtenerIndicadoresEconomicosXML`,
        qs.stringify(paramsConCodigo),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      let xml = response.data;
      let decodedXml = he.decode(xml);
      return decodedXml;
    } catch (error) {
      console.error(
        `Error al obtener tipo de cambio ${codigoIndicador}:`,
        error
      );
      return null;
    }
  };

  try {
    const [compraResponse] = await Promise.all([
      obtenerTipoCambio("318"), // Tipo de cambio de venta
    ]);
    return compraResponse;
  } catch (error) {
    console.error("Error en la función compra:", error);
    return null;
  }
}

export async function comprarDolar() {
  const tipocambiocompra = await compra(); // Esperamos la respuesta XML

  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

    parser.parseString(tipocambiocompra, (err, result) => {
      if (err) {
        console.error("Error al parsear XML:", err);
        reject(err); // Rechazamos la promesa en caso de error
      } else {
        // Extraer datos correctamente
        const indicador =
          result.string.Datos_de_INGC011_CAT_INDICADORECONOMIC
            .INGC011_CAT_INDICADORECONOMIC;

        resolve(indicador); // Retornamos el objeto JSON directamente
      }
    });
  });
}

export async function ventaDolar() {
  const tipocambioventa = await venta(); // Esperamos la respuesta XML

  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });

    parser.parseString(tipocambioventa, (err, result) => {
      if (err) {
        console.error("Error al parsear XML:", err);
        reject(err); // Rechazamos la promesa en caso de error
      } else {
        // Extraer datos correctamente
        const indicador =
          result.string.Datos_de_INGC011_CAT_INDICADORECONOMIC
            .INGC011_CAT_INDICADORECONOMIC;

        resolve(indicador); // Retornamos el objeto JSON directamente
      }
    });
  });
}
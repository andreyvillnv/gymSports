import { query, Router } from "express";
import session from "express-session";
import { cifrar, descifrar } from "../cifrado.js";
import {
  datosPaises,
  bloquearCuenta,
  comprobarCuentaActiva,
  activarCuenta,
  cambiarPass,
  comprobarPass,
  codigoUsuarioGoogleAut,
  codigoGoogleAut,
  verificarGoogleAut,
  citaNutricion,
  idUsuario,
  agregarRutina,
  perfil,
  dataPerfil,
  citaFisio,
  citaPerfilNutricion,
  cambioCitaNutricion,
  nuevoRegistro,
  credencilales,
  intentosSesion,
  agregarIntentos,
  bloqueoCuenta,
  banco
} from "../querys-sql.js";
import { datosDePaises } from "../datos-paises.js";
import { verificarAutenticacion } from "../authMiddleware.js";
import { enviarCorreoVerificacion } from "../verificacion-de-correo.js";
import { eventos } from "../registrar-eventos.js";
import speakeasy from "speakeasy";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import axios from "axios";
import { ventaDolar, comprarDolar } from "../public/js/apiBCCR.js";

//import dotenv from "dotenv";

//dotenv.config({ path: "./src/.env" });

const router = Router();
//pago con paypal
router.post("/pagoPayPal", verificarAutenticacion, async (req, res) => {
  try {
    req.session.paymentData = {
      fecha: req.body.fecha,
      hora: req.body.hora,
      descripcion: req.body.descripcion,
      tipo: req.body.nutricion,
    };
    const dolarCompra = await comprarDolar();
    console.log("pp", dolarCompra);
    //const dolarJSON = JSON.parse(dolarCompra)

    const dolarInt = parseFloat(dolarCompra.NUM_VALOR).toFixed(2);
    const dolar = parseFloat(dolarInt);
    const valordolar = (10000 / dolar).toFixed(2);

    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: valordolar,
          },
        },
      ],
      application_context: {
        brand_name: "mycompany.com",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `http://${process.env.HOST}:${process.env.PORT}/capture-order`,
        cancel_url: `http://${process.env.HOST}:${process.env.PORT}/cancel-payment`,
      },
    };
    // format the body
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    // Generate an access token
    const {
      data: { access_token },
    } = await axios.post(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET,
        },
      }
    );

    console.log(access_token);

    // make a request
    const response = await axios.post(
      `${process.env.PAYPAL_API}/v2/checkout/orders`,
      order,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    console.log(response.data);

    return res.json(response.data);
  } catch (error) {
    console.log("/pagoPayPal", error);
    return res.status(500).json("Something goes wrong");
  }
});

router.get("/capture-order", async (req, res) => {
  const { token } = req.query;

  try {
    const response = await axios.post(
      `${process.env.PAYPAL_API}/v2/checkout/orders/${token}/capture`,
      {},
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET,
        },
      }
    );

    console.log("orden comfirmada", response.data);

    const paymentData = req.session.paymentData;

    if (paymentData.tipo === "nutricion") {
      const data = {
        idcliente: req.session.usuario,
        fecha: paymentData.fecha,
        hora: paymentData.hora,
        descripcion: paymentData.descripcion,
      };

      await citaNutricion(data);

      res.render("cita-nutricion.ejs", {
        hora: paymentData.hora,
        fecha: paymentData.fecha,
      });
      console.log("Datos adicionales:", paymentData);
    }
  } catch (error) {
    console.log("error en /capture-orde", error.message);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

router.get("/cancel-payment", (req, res) => {
  try {
    res.render("pago-cancelado.ejs");
  } catch (error) {}
});

router.get("/", (req, res) => res.render("login.ejs", { error: "" }));

router.get("/login", (req, res) => res.render("login.ejs", { error: "" }));

router.post("/registrarNuevo", async (req, res) => {
  try {
    const pass = await cifrar(req.body.pass);
    const data = {
      correo: req.body.correo,
      nombre: req.body.nombre,
      apellidos: req.body.apellidos,
      pass: pass,
      celular: req.body.celular,
      fechaNac: req.body.fecha,
      peso: req.body.peso,
      altura: req.body.altura,
      genero: req.body.genero,
      estado: false,
    };
    const validarcorreo = await nuevoRegistro(data);
    if (validarcorreo) {
      //await  idUsuario(data.correo);
      await enviarCorreoVerificacion(data.correo);
      //console.log("Redirigiendo a login...");
      res.render("login.ejs", {
        error: "Verifica tu correo para activar la cuenta",
      });

      //res.render('index.ejs')
    } else if (!validarcorreo) {
      res.render("registro.ejs", { error: "El correo ya está en uso" });
    }
  } catch (error) {}
});

router.get("/buscar-cedula", async (req, res) => {
  try {
    const { cedula } = req.query; // ✅ CORREGIDO: Usar req.query en lugar de res.params
    console.log("Cédula recibida:", cedula);

    if (!cedula) {
      return res.status(400).json({ error: "Cédula es requerida" });
    }

    const response = await axios.get(`http://localhost:3040/cedula/${cedula}`);

    return res.status(200).json(response.data); // ✅ CORREGIDO: Enviar solo response.data
  } catch (error) {
    console.error("Error al consultar la API:", error.message);

    if (error.response) {
      // Manejo de errores según el código de estado HTTP
      if (error.response.status === 404) {
        return res.status(404).json({ error: "Cédula no encontrada" });
      } else {
        return res.status(error.response.status).json({ error: error.response.data });
      }
    } else if (error.request) {
      return res.status(500).json({ error: "No hubo respuesta del servidor externo" });
    } else {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }
});

router.get("/verificar/:token", async (req, res) => {
  try {
    const { token } = req.params;
    //console.log("jwt", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("correo verificación", req.params);
    //console.log("decoded", decoded);
    const id = await idUsuario(decoded.email);

    const result = await activarCuenta(id);
    //db.execute("UPDATE usuarios SET verificado = 1 WHERE email = ?", [decoded.email]);

    if (result) {
      res.render("login.ejs", {
        error: "Cuenta verificada con éxito. Ya puedes iniciar sesión",
      });
      // res.send("<h1>Cuenta verificada con éxito. Ya puedes iniciar sesión.</h1>");
      // res.redirect('/');
    } else {
      res.render("login.ejs", {
        error: "Se produjo un error en la activación de la cuenta",
      });
      // res.send("<h1>Error al verificar la cuenta.</h1>");
    }
  } catch (error) {
    // console.log(error);
    res.send("<h1>Token inválido o expirado.</h1>");
  }
});

//evento
router.get("/logout", async (req, res) => {
  try {
    const data = {
      idcliente: req.session.usuario,
      evento: "cierre de sesión",
    };
    await eventos(data);
    req.session.destroy((err) => {
      if (err) {
        return res.send("Error al cerrar sesión");
      }
      res.redirect("/login"); // Redirigir al login después de cerrar sesión
    });
  } catch (error) {}
});

//evento
router.post("/login", async (req, res) => {
  try {
    const data = {
      correo: req.body.correo,
      pass: req.body.pass,
    };
    const estado = await comprobarCuentaActiva(data.correo);
    //console.log("estado", estado);
    if (!estado) {
      res.render("login.ejs", { error: "La cuenta no está activada" });
      return;
    }
    if (data.correo === "" || data.pass === "") {
      res.render("login.ejs", { error: "Los campos no pueden estar vacios." });
      return;
    }
    const id = await idUsuario(data.correo);
    const id_usuario = id[0][0].idcliente
    console.log("id_usuario", id_usuario);
    req.session.usuario = id_usuario;
    const dataBloqueo = await bloqueoCuenta(id_usuario);
    console.log("intentos", dataBloqueo);

    if (dataBloqueo.bloqueo && new Date(dataBloqueo.bloqueo) > new Date()) {
      const tiempoRestante = Math.ceil(
        (new Date(dataBloqueo.bloqueo) - new Date()) / 60000
      );
      console.log(
        `Cuenta bloqueada. Intenta nuevamente en ${tiempoRestante} minutos.`
      );
      res.render("login.ejs", {
        error: `Cuenta bloqueada. Intenta nuevamente en ${tiempoRestante} minutos.`,
      });
      return;
    }

    const pass = await credencilales(id_usuario);
    const descifrado = await descifrar(data.pass, pass.pass);
    // const id_usuario = await idUsuario(data.correo);
    const dataE = {
      idcliente: req.session.usuario,
      evento: "intento de inicio de sesión",
    };
    await eventos(dataE);
    if (descifrado) {
      //console.log("id user= ",id_usuario)
      await intentosSesion(id_usuario);
      //Verifica si tiene autenticación en 2 pasos de google aut.
      const estado = await verificarGoogleAut(id_usuario);
      //console.log("google ", estado);
      if (estado) {
        res.render("ingreso-2fa.ejs", {
          error: "",
          usuario: req.session.usuario,
        });
        return;
        // console.log("entrando")
      } else {
        await datosDePaises();
        res.render("index.ejs");
        return;
      }
    } else {
      const nuevosIntentos = dataBloqueo.intentos + 1;
      let bloqueoTiempo = null;
      if (nuevosIntentos >= 3) {
        bloqueoTiempo = new Date(Date.now() + 60 * 60 * 1000); // Bloqueo por 1 hora
        const dataIntentos = {
          intentos: nuevosIntentos,
          bloqueo: bloqueoTiempo,
          id: id_usuario,
        };
        console.log("data intentos", dataIntentos);
        await bloquearCuenta(dataIntentos);
        res.render("login.ejs", {
          error:
            "Has superado el límite de intentos. Intenta nuevamente en 1 hora.",
        });
        return;
      } else {
        const dataIntentos = {
          intentos: nuevosIntentos,
          id: id_usuario,
        };
        await agregarIntentos(dataIntentos);
        res.render("login.ejs", { error: "Correo o contraseña incorrectos" });
        return;
      }
      //res.render('login.ejs', { error: "Correo o contraseña incorrectos" });
      // console.log("intento de login");
      return;
    
    }
  } catch (error) {
    console.log("error en /login", error);
    res.render("login.ejs", { error: "El correo no existe" });
  }
});

router.get("/registro", async (req, res) => {
  res.render("registro.ejs", { error: "" });
});

router.get("/cambioContrasena", async (req, res) => {
  res.render("cambiar-contrasena.ejs", { error: "" });
});
router.post("/cambiar", async (req, res) => {
  try {
    const data = {
      correo: req.body.correo,
      pass: req.body.pass,
    };
    const id = await idUsuario(data.correo);
    const passAntiguo = await comprobarPass(id);
    const pass = await descifrar(data.pass, passAntiguo);
    if (pass.password) {
      res.render("cambiar-contrasena.ejs", {
        error: "No se puede usar la contraseña anterior",
      });
      return;
    } else {
      const pass_ = await cifrar(data.pass);
      const newPass = {
        pass: pass_,
        id: id,
        idpass: pass.id,
      };
      await cambiarPass(newPass);
      res.render("login.ejs", { error: "Contraseña cambiada. Inicia sesión" });
    }
  } catch (error) {
    console.log("error en /cambiar ", error);
    res.render("cambiar-contrasena.ejs", {
      error: "Se a producido un error. El correo ingresado no existe.",
    });
  }
});
router.get("/fisioterapia", verificarAutenticacion, (req, res) => {
  res.render("fisioterapia.ejs", { usuario: req.session.usuario });
});

router.get("/matricula", verificarAutenticacion, (req, res) => {
  res.render("planes-matricula.ejs", { usuario: req.session.usuario });
});
//evento
router.get("/perfil", verificarAutenticacion, async (req, res) => {
  try {
    const id = req.session.usuario;
    const dataPC = [
      "nombre",
      "apellidos",
      "correo",
      "idrutina",
      "nutricion",
      "peso",
      "altura",
      "genero",
      "fisio",
      "idrutina",
      "fecha_nacimiento",
    ];
    const rows = await dataPerfil(id, dataPC); // Obtener datos del perfil
    const citasNutricion = await citaPerfilNutricion(id);

    // Obtener citas de nutrición
    const data = {
      idcliente: id,
      evento: "ingreso al perfil",
    };
    await eventos(data);
    let cita = "";
    if (citasNutricion.length > 0) {
      const fecha = citasNutricion[0].fecha.toISOString().split("T")[0];
      const hora = citasNutricion[0].fecha.toTimeString().split(" ")[0];
      cita = fecha + " a las " + hora;
    } else {
      cita = "Sin cita asignada";
    }
    // console.log('perfil', rows)
    // const fechaNac = rows.fecha_nacimiento.toISOString().split("T")[0];
    res.render("perfil.ejs", {
      usuario: req.session.usuario,
      nombre: rows.nombre + " " + rows.apellidos,
      fecha: rows.fecha_nacimiento,
      estatura: rows.altura,
      peso: rows.peso,
      citaNutri: cita,
      error: "",
    });
  } catch (error) {
    console.error("Error en la ruta /perfil:", error);
    res.status(500).send("Error interno del servidor");
  }
});

router.get("/nutricion", verificarAutenticacion, (req, res) => {
  res.render("nutricion.ejs", { usuario: req.session.usuario });
});

router.get("/cambiarCitaNutri", verificarAutenticacion, (req, res) => {
  try {
    res.render("cambiar-cita-nutricion.ejs", { usuario: req.session.usuario });
  } catch (error) {}
});

//evento
router.post(
  "/cambioCitaNutricion",
  verificarAutenticacion,
  async (req, res) => {
    try {
      const data = {
        user: 11111,
        fecha: req.body.fecha,
        hora: req.body.hora,
        descripcion: req.body.descripcion,
      };
      // console.log(data);
      await cambioCitaNutricion(data);
      const dataE = {
        idcliente: req.session.usuario,
        evento: "cambio de cita nutrición",
      };
      await eventos(dataE);
    } catch (error) {}
    const data = {
      user: 1,
      fecha: req.body.fecha,
      hora: req.body.hora,
      descripcion: req.body.descripcion,
    };

    res.render("cita-nutricion.ejs", {
      usuario: req.session.usuario,
      fecha: data.fecha,
      hora: data.hora,
    });
  }
);

//evento
router.get("/home", verificarAutenticacion, (req, res) => {
  try {
    const data = {
      idcliente: req.session.usuario,
      evento: "ingreso al home",
    };
    res.render("index.ejs", { usuario: req.session.usuario });
  } catch (error) {}
});

router.get("/entrenamientosPesas", verificarAutenticacion, (req, res) => {
  res.render("entrenamientosPesas.ejs", { usuario: req.session.usuario });
});

router.get("/bajarPeso", verificarAutenticacion, (req, res) => {
  res.render("bajarPeso.ejs", { usuario: req.session.usuario });
});

router.get("/3-dias-bajarPeso", verificarAutenticacion, (req, res) => {
  res.render("3-dias-bajar-peso.ejs", { usuario: req.session.usuario });
});

router.post("/citaNutricion", verificarAutenticacion, async (req, res) => {
  try {
    const data = {
      user: req.session.usuario,
      fecha: req.body.fecha,
      hora: req.body.hora,
      descripcion: req.body.descripcion,
    };
    await citaNutricion(data);
    res.render("cita-nutricion.ejs", {
      usuario: req.session.usuario,
      fecha: data.fecha,
      hora: data.hora,
    });
  } catch (error) {}
});

router.post("/citaFisio", verificarAutenticacion, async (req, res) => {
  try {
    const data = {
      user: 1,
      fecha: req.body.fecha,
      hora: req.body.hora,
      descripcion: req.body.descripcion,
    };
    await citaFisio(data);
    res.render("cita-fisioterapia.ejs", {
      usuario: req.session.usuario,
      fecha: data.fecha,
      hora: data.hora,
    });
  } catch (error) {}
});

router.post("rutina-3-bajar-peso", verificarAutenticacion, async (req, res) => {
  try {
    const data = {
      user: req.session.usuario,
      rutina: "3DBP",
    };
    await agregarRutina(data);
  } catch (error) {}
});

//Google Authenticator

// Ruta para generar el secreto activarGoogleAut
router.get("/activarGoogleAut", verificarAutenticacion, async (req, res) => {
  try {
    const estado = await verificarGoogleAut(req.session.usuario);
    if (estado) {
      const data = {
        message: "activa",
      };
      res.json(data);
    } else {
      let codigo = null;
      const secret = speakeasy.generateSecret({ length: 20 });
      codigo = secret.base32; // Guardar el secreto
      const data = {
        message: codigo,
      };
      res.json(data);
    }
  } catch (error) {}
  // Enviar el secreto al frontend
});

router.post(
  "/activarSevicioGoogleAut",
  verificarAutenticacion,
  async (req, res) => {
    try {
      const { codigo } = req.body;

      await codigoGoogleAut(req.session.usuario, codigo);
      //console.log("Hecho");
      // const id = req.session.usuario;
      const data = {
        message:
          "Código activado. Asegúrate de activarlo en la aplicación de Google Authenticator",
      };

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al activar" });
    }
  }
);
// Ruta para verificar el código 2FA
router.post("/2fa/verify", verificarAutenticacion, async (req, res) => {
  try {
    const codigo = [
      req.body.valor0,
      req.body.valor1,
      req.body.valor2,
      req.body.valor3,
      req.body.valor4,
      req.body.valor5,
    ];
    const token = Number(codigo.join(""));

    const codigoUsario = await codigoUsuarioGoogleAut(req.session.usuario);
    //console.log("Codigo", codigoUsario[0][0].googleauthen);
    const verified = speakeasy.totp.verify({
      secret: codigoUsario[0][0].googleauthen,
      encoding: "base32",
      token: token,
    });
    // console.log("Codigo, verificado", codigoUsario, verified);
    if (verified) {
      res.redirect("/home");
    } else {
      res.render("ingreso-2fa.ejs", {
        usuario: req.session.usuario,
        error: "Código no válido",
      });
    }
  } catch (error) {}
});

export default router;

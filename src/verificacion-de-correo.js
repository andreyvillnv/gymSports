

import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
//import dotenv from "dotenv";

//dotenv.config({ path: "./src/.env" });

// Configuración del transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function enviarCorreoVerificacion(email) {
    try {
        console.log('Correo del usuario:', email);

        // Verifica que las variables de entorno estén configuradas
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.JWT_SECRET) {
            throw new Error("Faltan variables de entorno necesarias.");
        }

        // Genera el token JWT
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Construye la URL de verificación
        const urlVerificacion = `http://localhost:${process.env.PORT}/verificar/${token}`;
        console.log('URL de verificación:', urlVerificacion);

        // Configura las opciones del correo
        const opcionesCorreo = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verifica tu cuenta",
            html: `<p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
                   <a href="${urlVerificacion}">${urlVerificacion}</a>`,
        };

        // Verifica la conexión con el servidor de correo
        transporter.verify((error, success) => {
            if (error) {
                console.error("🚨 Error al conectar con el servidor de correo:", error);
                throw error; // Lanza el error para que sea capturado en el catch
            } else {
                console.log("✅ Servidor de correo listo para enviar mensajes");
            }
            console.log('trasnporter',error, success) 
        });

        // Envía el correo
        const info = await transporter.sendMail(opcionesCorreo);
        console.log("Correo enviado correctamente:", info);

    } catch (error) {
        console.error('Error en enviarCorreoVerificacion:', error);
        throw error; // Relanza el error para que pueda ser manejado por el llamador
    }
}
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

admin.initializeApp();
const client = new vision.ImageAnnotatorClient();

exports.validarDniIA = onObjectFinalized({ memory: "1GiB" }, async (event) => {
  const object = event.data;
  const filePath = object.name;

  if (!filePath.startsWith("verificaciones/")) return null;

  const uid = filePath.split("/")[1];
  const gcsUri = `gs://${object.bucket}/${filePath}`;

  try {
    const [result] = await client.annotateImage({
      image: { source: { gcsImageUri: gcsUri } },
      features: [{ type: 'TEXT_DETECTION' }, { type: 'LABEL_DETECTION' }]
    });

    const labels = result.labelAnnotations || [];
    const fullText = result.textAnnotations.length > 0 ? result.textAnnotations[0].description.toUpperCase() : "";

    const db = admin.firestore();
    const userSnap = await db.collection("usuarios").doc(uid).get();
    if (!userSnap.exists) return null;
    const datosUsuario = userSnap.data();

    const esDocumento = labels.some(l =>
      l.description.includes("Identity document") || l.description.includes("Document")
    );


    const nombreCoincide = fullText.includes(datosUsuario.nombre.toUpperCase());

    const apellidosCoincide = fullText.includes(datosUsuario.apellidos.toUpperCase());


    const tieneFormatoDni = /[0-9]{8}[A-Z]/.test(fullText);


    let estado = "rechazado";
    let verificado = false;

    if (esDocumento && tieneFormatoDni && nombreCoincide && apellidosCoincide) {
      estado = "aprobado";
      verificado = true;
      console.log(`IA: Usuario ${uid} aprobado.`);
    } else {
      console.log(`IA: Usuario ${uid} rechazado. Motivos -> Doc: ${esDocumento}, Formato: ${tieneFormatoDni}, Nombre: ${nombreCoincide}`);
    }

    return db.collection("usuarios").doc(uid).update({
      verificado: verificado,
      estadoVerificacion: estado,
      ia_debug: {
        labels: labels.map(l => l.description).slice(0, 5),
        formatoDni: tieneFormatoDni,
        nombreEncontrado: nombreCoincide
      }
    });

  } catch (error) {
    console.error("Error en Cloud Function:", error);
    return null;
  }
});

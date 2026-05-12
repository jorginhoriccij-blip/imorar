const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FB_PROJECT,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  })
}

const db = admin.firestore()

const PLANOS = {
  starter: { plan: 'starter', limiteImoveis: 1, dias: 30 },
  pro:     { plan: 'pro',     limiteImoveis: 3, dias: 30 },
  master:  { plan: 'master',  limiteImoveis: 6, dias: 30 }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body)

    // Só processa pagamentos aprovados
    const status = body?.status || body?.payment?.status
    if (status !== 'approved' && status !== 'paid') {
      return { statusCode: 200, body: 'ignored' }
    }

    // UID enviado via parâmetro no link: ?uid=xxxxx
    const uid = body?.metadata?.uid
            || body?.customer?.uid
            || body?.uid
            || body?.reference

    // Detecta plano pelo valor pago
    const valor = Number(body?.amount || body?.payment?.amount || 0) / 100
    let planoKey = 'starter'
    if (valor >= 120)    planoKey = 'master'
    else if (valor >= 60) planoKey = 'pro'

    if (!uid) {
      console.error('UID não encontrado:', JSON.stringify(body))
      return { statusCode: 400, body: 'UID missing' }
    }

    const plano      = PLANOS[planoKey]
    const expiracao  = new Date()
    expiracao.setDate(expiracao.getDate() + plano.dias)

    await db.collection('users').doc(uid).update({
      plan:          plano.plan,
      limiteImoveis: plano.limiteImoveis,
      planoAtivo:    true,
      dataExpiracao: admin.firestore.Timestamp.fromDate(expiracao),
      atualizadoEm:  admin.firestore.FieldValue.serverTimestamp()
    })

    console.log(`Plano ${plano.plan} ativado para uid: ${uid}`)
    return { statusCode: 200, body: JSON.stringify({ ok: true, plan: plano.plan }) }

  } catch (err) {
    console.error('Erro no webhook:', err)
    return { statusCode: 500, body: err.message }
  }
}

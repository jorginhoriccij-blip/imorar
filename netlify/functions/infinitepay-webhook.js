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

function detectarPlano(amount) {
  var valor = Number(amount || 0) / 100
  if (valor >= 120) return 'master'
  if (valor >= 60)  return 'pro'
  return 'starter'
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    var body = JSON.parse(event.body)
    console.log('Webhook recebido:', JSON.stringify(body))

    var orderNsu = body.order_nsu || ''
    var parts    = orderNsu.split('|')
    var uid      = parts[0]
    var planoKey = parts[1] || detectarPlano(body.amount)

    if (!uid) {
      console.error('UID nao encontrado:', orderNsu)
      return { statusCode: 400, body: 'UID missing' }
    }

    var plano     = PLANOS[planoKey] || PLANOS.starter
    var expiracao = new Date()
    expiracao.setDate(expiracao.getDate() + plano.dias)

    await db.collection('users').doc(uid).update({
      plan:          plano.plan,
      limiteImoveis: plano.limiteImoveis,
      planoAtivo:    true,
      dataExpiracao: admin.firestore.Timestamp.fromDate(expiracao),
      atualizadoEm:  admin.firestore.FieldValue.serverTimestamp()
    })

    console.log('Plano ' + plano.plan + ' ativado para uid: ' + uid)
    return { statusCode: 200, body: JSON.stringify({ ok: true, plan: plano.plan }) }

  } catch (err) {
    console.error('Erro no webhook:', err)
    return { statusCode: 500, body: err.message }
  }
}

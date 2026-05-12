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
    console.log('Webhook recebido:', J

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { uid, plano } = JSON.parse(event.body)

    if (!uid || !plano) {
      return { statusCode: 400, body: 'uid e plano sao obrigatorios' }
    }

    const PRECOS = { starter: 3900, pro: 6900, master: 12900 }
    const NOMES  = {
      starter: 'IMORAR Starter R$ 39/mes',
      pro:     'IMORAR PRO R$ 69/mes',
      master:  'IMORAR Master R$ 129/mes'
    }

    const payload = {
      handle:       'jorge-ricci-junior',
      items:        [{ quantity: 1, price: PRECOS[plano], description: NOMES[plano] }],
      order_nsu:    uid + '|' + plano,
      webhook_url:  'https://appimorar.netlify.app/.netlify/functions/infinitepay-webhook',
      redirect_url: 'https://appimorar.netlify.app'
    }

    const res = await fetch('https://api.checkout.infinitepay.io/links', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })

    const data = await res.json()
    console.log('InfinitePay response:', JSON.stringify(data))

    const url = data.url || data.link || data.checkout_url || data.payment_url
    if (!url) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Link nao gerado', data: data }) }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: url })
    }

  } catch (err) {
    console.error('Erro ao gerar link:', err)
    return { statusCode: 500, body: err.message }
  }
}

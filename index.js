 const fero = require('fero')
  , by = require('utilise/by')
  , fn = require('utilise/fn')
  , key = require('utilise/key')
  , deb = require('utilise/deb')('rproxy')
  , push = require('utilise/push')
  , slice = require('utilise/slice')
  , connect = require('fero/connect')
  , values = require('utilise/values')
  , debounce = require('utilise/debounce')
  , discover = require('fero/discovery/multicast')
  , log = require('utilise/log')('rijs/fero-loader')
  // , fn = b => (new Function('module', 'exports', 
  //                           'require', 'process', `module.exports = ${b}`))
  
  , get = key
  , connected = async (clients, servers) => Promise.all([
      ...values(clients).map(d => !d || !d.peers || d.peers.lists.connected.length || d.peers.me || d.once('connected'))
    , ...values(servers).map(d => !d || !d.peers || d.peers.lists.client.length    || d.once('client'))
  ])

  , proxy = ripple => name => async ({ socket, data }) => {
      await connected({ [name]: ripple(name) })

      const { sessionID } = socket
          , { key, type, value } = data
          , req = { key, type, value, sessionID }
          , method = ripple(name).peers.me ? 'accept' : 'send'

      deb('proxy', name, req)

      return ripple(name).peers[method](req)
        .on('reply')
        .map(d => {
           if (by(get('headers.content-type'), 'application/javascript')(d.value)){
            get('value', fn)(d.value)
          }

          // return d.value
          return d.value.type ? get(['type', 'value', 'key'])(d.value)
               : d.type       ? get(['type', 'value', 'key'])(d)
                              : d.value

      })
      .unpromise() 
  }
  , feroUnwrap = async name => {
    const body = await fero(name, { client: true })
    return body
  }
  , createFeroResource = (name) => ({
      name
    , body: key(`ripple.resources.${name}`)(global) 
        ? ripple(name) 
        : feroUnwrap(name)
    , headers: {
        from: proxy(ripple)(name)
      , loaded: (ripple, { body }) => connected({ body })
      , destroy: (ripple, { body }) => body.destroy()
      }
  })

module.exports = async function loader(ripple){
  log('creating')
  const udp = discover()
    , registered = []
  
  await udp.once('listen')

  udp
    .on('list')
    .filter(([name]) => !registered.includes(name))
    // .map(async ([name]) => {
    .map(([name]) => {
      push(name)(registered)

      // const comps = await fero(name, { client: true } )
      // await comps.once('connected')
    
     //  const data = await comps.peers.send({
     //   type: 'SUBSCRIBE', 
     //   value: {}
     //  }).on('reply')
     //
     //  data.value
     //    .filter(by(key('headers.content-type'), 'application/javascript'))
     //    .map(key('body', fn))
     //
     // return data.value
      log(`FOUND ${name} SERVICE`)
      return name
    })
    .map(createFeroResource)
    .map(async d => {
      ripple(log(await d))
    })

  return ripple
}

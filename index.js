 const fero = require('fero')
  , by = require('utilise/by')
  , key = require('utilise/key')
  , push = require('utilise/push')
  , slice = require('utilise/slice')
  , debounce = require('utilise/debounce')
  , discover = require('fero/discovery/multicast')
  , log = require('utilise/log')('rijs/fero-loader')
  , fn = b => (new Function('module', 'exports', 
                            'require', 'process', `module.exports = ${b}`))

module.exports = async function loader(ripple){
  log('creating')
  const udp = discover()
    , registered = []
  
  await udp.once('listen')

  udp
    .on('list')
    .filter(([name]) => !registered.includes(name))
    .map(async ([name]) => {
      push(name)(registered)

      const comps = await fero(name, { client: true } )
      await comps.once('connected')
    
      const data = await comps.peers.send({
       type: 'SUBSCRIBE', 
       value: {}
      }).on('reply')

      data.value
        .filter(by(key('headers.content-type'), 'application/javascript'))
        .map(key('body', fn))

     return data.value
    })
    .map(async d => {
      ripple(log(await d))
    })
}

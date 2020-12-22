const Vec3 = require('vec3')
const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalNear } = require('mineflayer-pathfinder').goals
process.setMaxListeners(0);

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node farmer.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}


/* Reference
 *       const goal = new GoalNear(pos.x, pos.y, pos.z, 4)
 *       bot.pathfinder.goto(goal, () => {
 *         bot.placeBlock(pos.offset(0,1,0), new Vec3(0,1,0), () => {
 *           console.log()
 *           console.log(pos.offset(0,1,0))
 *           bot.chat('Placed.')
 */

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'farmer',
  password: process.argv[5]
})

let mcData
bot.on('inject_allowed', () => {
  mcData = require('minecraft-data')(bot.version)
})

bot.loadPlugin(pathfinder)


// To fish we have to give bot the seeds
// /give farmer wheat_seeds 64

function blockToSow() {
  Movements.canDig = false
  return bot.findBlock({
    point: bot.entity.position,
    maxDistance: 64,
    matching: (block) => {
      // First check the type
      if (block && block.type === mcData.blocksByName.mycelium.id) {
        // If position is defined, you can refine the search
        if (block.position) {
          const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
          return blockAbove.type === mcData.blocksByName.air.id
        }
        return true // otherwise return always true (there is mycelium in the section so it should be checked)
      }
      return false
    }
  })
}

function blockToHarvest() {
  return bot.findBlock({
    point: bot.entity.position,
    matching: (block) => {
      return block && block.type === mcData.blocksByName.air.id && block.metadata === 7
    }
  })
}

function loop() {
  var blockChange = 0 
  try {
    const toSow = blockToSow()
    if (toSow) {
      //bot.chat("We got here!, should we be here? probably..")
      const goal = new GoalNear(toSow.position.x, toSow.position.y, toSow.position.z, 2)
      // bot.chat("set goal")
      // console.log(goal)
      bot.pathfinder.goto(goal, () => {
        // bot.chat("goal Reached!")
        return bot.equip(mcData.itemsByName.white_wool.id, 'hand', () => {
          // bot.chat("wool equiped")
          // if (toSow.position.x == bot.entity.position.x && toSow.position.y + 1 == bot.entity.position.y && toSow.position.z == bot.entity.z) {
          const flooredPos = bot.entity.position.floored()
          // const comparePos = exactEquals()
          // console.log(toSow.position.offset(0,1,0), flooredPos)
          //console.log(toSow.position.offset(0,1,0).distanceTo(flooredPos))
          //console.log(toSow.position)
          //console.log(bot.entity.position)
          // console.log(tosow.position, bot.entity.position, flooredPos)
          // .log(toSow.position.offset(0, 1, 0).distanceTo(bot.entity.position))
          if (toSow.position.offset(0, 1, 0).distanceTo(bot.entity.position) < 2) {
            //bot.chat("below me")
            //bot.chat("Block is below me")
            bot.setControlState('jump', true)
            bot.placeBlock(toSow, new Vec3(0, 1, 0), () => {
              bot.setControlState('jump', false)
              var blockChange = 0
              setImmediate(loop)
            })
            blockChange++
          }
          //bot.chat("block Isn't below me")
          //bot.setControlState('jump', true)
          
          bot.placeBlock(toSow, new Vec3(0, 1, 0), () => {
            var blockChange = 0 
            setImmediate(loop)
          })
          blockChange++

        })
      })
      if (!toSow) {
        bot.chat("uhm WHAT im not supposed to be here, I need to loop")
      }
      if (blockChange > 10) {
        bot.chat("/home island")
      }
    }
  }
  catch (e) {
    console.log(e)
  }
  // None blocks to harvest or sow. Postpone next loop a bit
  setTimeout(loop, 1000)
}


bot.once('login', loop)

import { Channel } from '../lib/channel'
import { sleep } from './utils'

async function consume(chan: Channel<number>): Promise<void> {
  while(true) {
    const item = await chan.recv()
    console.log(`[CONSUMER] ${new Date()} received item ${item}`)
    if (item === null) {
      console.log('stopping consumer')
      return
    }
    await sleep(1000)
  }
}

async function main(): Promise<void> {
  const channel = new Channel<number>(5)

  // Start consumers
  consume(channel)

  // Fill the channel
  for (let i=0; i<10; ++i) {
    console.log(`[PRODUCER] ${new Date()} sending item ${i}`)
    await channel.send(i)
  }

  // Close the channel, which will make the consumers exit once they made the
  // channel empty.
  channel.close()
}

main()

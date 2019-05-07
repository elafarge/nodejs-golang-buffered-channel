import { Channel } from '../lib/channel'
import { sleep } from './utils'

async function consume(chan: Channel<number>): Promise<void> {

  await chan.forEach(
    async (item: number): Promise<void> => {
      console.log(`[CONSUMER] ${new Date()} received item ${item}`)
      await sleep(1000)
    }
  )

  console.log('stopping consumer')
}

async function main(): Promise<void> {
  const channel = new Channel<number>(5)

  // Start consumers
  consume(channel)

  // Fill the channel
  for (let i = 0; i < 10; ++i) {
    console.log(`[PRODUCER] ${new Date()} sending item ${i}`)
    await channel.send(i)
  }

  // Close the channel, which will make the consumers exit once they made the
  // channel empty.
  channel.close()
}

main()

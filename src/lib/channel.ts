
/**
 * This interface describe a channel from which one can only consume. Useful to
 * pass a (bidirectionnal) channel to a method while ensuring the method will
 * only read from that channel, never write to it.
 */
export interface ReceiveOnlyChannel<T> {
  recv(): Promise<T | null>
  forEach(handler: (item: T) => Promise<void>): Promise<void>
}

/**
 * This interface describes a channel to which one can only push. This is useful
 * to pass a (bidirectionnal) channel to a method while ensuring the method will
 * only write to that channel, never read from it
 */
export interface SendOnlyChannel<T> {
  send(item: T): Promise<void>
  close(): void
}

/**
 * Channel is a type that mimics Golang (buffered) channels
 *
 * - Pushes are blocking by default: if an item is pushed into a channel, the
 *   push() method will block until someone reads from that channel.
 *
 * - The "size" argument can be used to control that behaviour: a push to a
 *   channel of size 5 will block only if 5 elements are already present in that
 *   channel
 *
 * - Channel receives are blocking as well: if no item is available, the pop()
 *   method will block until an element is pushed to the channel
 */
export class Channel<T> implements ReceiveOnlyChannel<T>, SendOnlyChannel<T> {
  private availableSlots: number
  private items: T[]
  private resolvePop: (() => void)[]
  private resolvePush: (() => void)[]
  private isClosed: boolean

  constructor(size: number = 1) {
    this.availableSlots = size
    this.resolvePush = []
    this.resolvePop = []
    this.items = []
    this.isClosed = false
  }

  public send = async (item: T): Promise<void> => {
    if (this.isClosed) {
      throw new Error("send on closed channel")
    }

    if(this.availableSlots <= 0) {
      await new Promise((resolve) => {
        this.resolvePush.push(resolve)
      })
    }

    this.availableSlots--
    this.items.push(item)

    // On push, unlock a pop "promise" if someone is waiting to pop shit
    if (this.resolvePop.length > 0) {
      const resolvePop = this.resolvePop.pop() as (() => void)
      resolvePop()
    }
  }

  public recv = async (): Promise<T | null> => {
    // If nothing to pop, let's wait (or return null if the channel is closed)
    if (this.items.length === 0) {
      if (this.isClosed) {
        return null
      }

      const lockId = Math.floor(Math.random() * 1000)
      await new Promise((resolve) => {
        this.resolvePop.push(resolve)
      })
    }

    // On pop, unlock a push "promise" if someone is waiting to push shit
    if(this.resolvePush.length > 0) {
      const resolvePush = this.resolvePush.pop() as (() => void)
      resolvePush()
    }
    this.availableSlots++

    const res = this.items[0]
    this.items = this.items.splice(1)
    return res
  }

  public close = () => {
    this.isClosed = true
  }

  public forEach = async (handler: (item: T) => Promise<void> ): Promise<void> => {
    while (true) {
      const item = await this.recv()
      if (item === null) {
        return
      }

      await handler(item)
    }
  }
}


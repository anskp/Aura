import {
  bytesToHex,
  cre,
  getNetwork,
  type HTTPPayload,
  hexToBase64,
  Runner,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, getAddress } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  chainSelectorName: z.string(),
  ccipConsumerAddress: z.string(),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

const payloadSchema = z.object({
  receiver: z.string(),
  amount: z.string(),
  data: z.string().optional(),
})

const onHTTPTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  if (!payload.input || payload.input.length === 0) {
    throw new Error('HTTP trigger payload is required')
  }

  const parsed = payloadSchema.parse(JSON.parse(payload.input.toString()))

  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })
  if (!network) throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  const receiver = getAddress(parsed.receiver)
  const amount = BigInt(parsed.amount)
  const data = (parsed.data ?? '0x') as `0x${string}`

  const reportData = encodeAbiParameters(
    [
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    [receiver, amount, data],
  )

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    })
    .result()

  const resp = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.ccipConsumerAddress,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  if (resp.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`writeReport failed: ${resp.errorMessage || resp.txStatus}`)
  }

  return bytesToHex(resp.txHash || new Uint8Array(32))
}

const initWorkflow = () => {
  const httpTrigger = new cre.capabilities.HTTPCapability()
  return [cre.handler(httpTrigger.trigger({}), onHTTPTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()

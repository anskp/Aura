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
import { encodeAbiParameters } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  chainSelectorName: z.string(),
  oracleConsumerAddress: z.string(),
  poolId: z.string(),
  assetId: z.string(),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

const payloadSchema = z.object({
  nav: z.string(),
  reserve: z.string(),
  timestamp: z.number().optional(),
  poolId: z.string().optional(),
  assetId: z.string().optional(),
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

  const poolId = (parsed.poolId ?? runtime.config.poolId) as `0x${string}`
  const assetId = (parsed.assetId ?? runtime.config.assetId) as `0x${string}`
  const nav = BigInt(parsed.nav)
  const reserve = BigInt(parsed.reserve)
  const timestamp = parsed.timestamp ?? Math.floor(Date.now() / 1000)
  const reportId = (`0x${Buffer.from(`navpor:${timestamp}`).toString('hex').padEnd(64, '0').slice(0, 64)}`) as `0x${string}`

  const reportData = encodeAbiParameters(
    [
      { name: 'poolId', type: 'bytes32' },
      { name: 'assetId', type: 'bytes32' },
      { name: 'nav', type: 'uint256' },
      { name: 'reserve', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'reportId', type: 'bytes32' },
    ],
    [poolId, assetId, nav, reserve, BigInt(timestamp), reportId],
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
      receiver: runtime.config.oracleConsumerAddress,
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

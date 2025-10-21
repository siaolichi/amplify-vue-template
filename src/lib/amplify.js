import { Amplify } from 'aws-amplify'

let configured = false

export function configureAmplify() {
  if (configured) return

  const [outputs] =
    Object.values(
      import.meta.glob('../../amplifyOutputs.json', {
        eager: true,
        import: 'default',
      }),
    ) || []

  if (!outputs) {
    if (import.meta?.env?.DEV) {
       
      console.warn(
        'Amplify outputs not found. Generate amplifyOutputs.json with `npx amplify pull` or `npx amplify sandbox --outputs-file ./amplifyOutputs.json`.',
      )
    }
    return
  }

  Amplify.configure(outputs)
  configured = true
}

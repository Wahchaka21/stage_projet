import { VideoFeature } from './video'

describe('VideoFeature', () => {
  it('should create', () => {
    const feat = new VideoFeature(
      {} as any,
      {} as any,
      { get: () => ({ subscribe: () => undefined }) } as any,
      () => true,
      () => undefined,
      () => undefined,
      async () => { },
      () => true,
      () => [],
      () => undefined,
      () => undefined,
      () => undefined
    )
    expect(feat).toBeTruthy()
  })
})

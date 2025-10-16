import { A as AbstractAudioOutNode } from './webAudioBaseSubGraph-Dit3Acqf.esm.js';

/**
 * Abstract class representing a sound in the audio engine.
 */
class AbstractSoundSource extends AbstractAudioOutNode {
    constructor(name, engine, nodeType = 2 /* AudioNodeType.HAS_OUTPUTS */) {
        super(name, engine, nodeType);
        this._outBus = null;
        this._onOutBusDisposed = () => {
            this._outBus = null;
        };
    }
    /**
     * The output bus for the sound.
     * @see {@link AudioEngineV2.defaultMainBus}
     */
    get outBus() {
        return this._outBus;
    }
    set outBus(outBus) {
        if (this._outBus === outBus) {
            return;
        }
        if (this._outBus) {
            this._outBus.onDisposeObservable.removeCallback(this._onOutBusDisposed);
            if (!this._disconnect(this._outBus)) {
                throw new Error("Disconnect failed");
            }
        }
        this._outBus = outBus;
        if (this._outBus) {
            this._outBus.onDisposeObservable.add(this._onOutBusDisposed);
            if (!this._connect(this._outBus)) {
                throw new Error("Connect failed");
            }
        }
    }
    /**
     * Releases associated resources.
     */
    dispose() {
        super.dispose();
        this._outBus = null;
    }
}

export { AbstractSoundSource as A };
//# sourceMappingURL=abstractSoundSource-CswqQ9DR.esm.js.map

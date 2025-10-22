export class AnimationControls {
  constructor(scene) {
    this.scene = scene;

    this.animationGroups = [];
    this.currentAnimationGroup = null;
    this.animMetas = [];
    this.audioElement = null;

    this.isScrubbing = false;
    this.isPlaying = false;
    this._lastKnownFrame = 0;

    this.animationSelect = document.getElementById("animationSelect");
    this.playBtn = document.getElementById("playBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.controls = document.getElementById("controls");

    this.createAdditionalControls();
  }

  // UI creation
  createAdditionalControls() {
    const timelineSpeedContainer = document.createElement('div');
    timelineSpeedContainer.className = 'control-group';
    timelineSpeedContainer.style.display = 'flex';
    timelineSpeedContainer.style.gap = '15px';
    timelineSpeedContainer.style.alignItems = 'center';
    timelineSpeedContainer.style.marginTop = '10px';
    timelineSpeedContainer.style.width = '100%';

    // Timeline slider (0..1000 normalized)
    const timelineSlider = document.createElement('input');
    timelineSlider.type = 'range';
    timelineSlider.id = 'timelineSlider';
    timelineSlider.min = '0';
    timelineSlider.max = '1000';
    timelineSlider.value = '0';
    timelineSlider.style.flex = '1';
    timelineSlider.style.cursor = 'pointer';

    // Speed selector
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed:';
    speedLabel.htmlFor = 'speedSelect';
    speedLabel.style.whiteSpace = 'nowrap';
    speedLabel.style.color = '#fff';
    speedLabel.style.minWidth = '50px';

    const speedSelect = document.createElement('select');
    speedSelect.id = 'speedSelect';
    speedSelect.style.padding = '4px 8px';
    speedSelect.style.borderRadius = '4px';
    speedSelect.style.border = '1px solid #444';
    speedSelect.style.background = '#2a2a2a';
    speedSelect.style.color = 'white';
    speedSelect.style.fontSize = '14px';
    speedSelect.style.cursor = 'pointer';

    [
      { value: '0.5', label: '0.5x' },
      { value: '1.0', label: '1.0x' },
      { value: '1.5', label: '1.5x' },
      { value: '2.0', label: '2.0x' },
    ].forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (option.value === '1.0') opt.selected = true;
      speedSelect.appendChild(opt);
    });

    timelineSpeedContainer.appendChild(timelineSlider);
    timelineSpeedContainer.appendChild(speedLabel);
    timelineSpeedContainer.appendChild(speedSelect);

    if (this.controls) this.controls.appendChild(timelineSpeedContainer);

    // Store refs
    this.timelineSlider = timelineSlider;
    this.speedSelect = speedSelect;

    // Scrubbing handlers
    let wasPlaying = false;

    const beginScrub = () => {
      if (!this.currentAnimationGroup) return;
      this._primeCurrentGroup();
      this.isScrubbing = true;
      wasPlaying = this.isPlaying;

      if (wasPlaying) {
        this.currentAnimationGroup.pause();
        if (this.audioElement && !this.audioElement.paused) this.audioElement.pause();
      }
    };

    const endScrub = () => {
      if (!this.currentAnimationGroup) return;
      this.isScrubbing = false;

      if (wasPlaying) {
        // Resume from the exact frame that was playing
        this.currentAnimationGroup.play(false);
        this.isPlaying = true;
        if (this.audioElement) this.audioElement.play().catch(() => {});
      }
    };

    // Pointer-based events
    this.timelineSlider.addEventListener('pointerdown', beginScrub);
    this.timelineSlider.addEventListener('pointerup', endScrub);
    this.timelineSlider.addEventListener('pointercancel', endScrub);
    this.timelineSlider.addEventListener('pointerleave', (e) => {
      if (this.isScrubbing && e.buttons === 0) endScrub();
    });

    // Seek on input (normalized 0..1)
    this.timelineSlider.addEventListener('input', (e) => {
      if (!this.currentAnimationGroup) return;
      this._primeCurrentGroup();

      const normalizedPos = Number(e.target.value) / 1000;
      const meta = this.getCurrentMeta();
      if (!meta) return;

      const targetFrame = meta.from + (meta.to - meta.from) * Math.min(Math.max(normalizedPos, 0), 1);
      
      const currentFrame = this.getCurrentFrame();
      const isBackwards = targetFrame < currentFrame;
      
      const currentSpeed = Number(this.speedSelect.value) || 1;
      
      if (isBackwards) {
        this.currentAnimationGroup.stop();
        this.currentAnimationGroup.reset();

        // Included because starting from stopped doesn't always reset cleanly
        this.currentAnimationGroup.start(false, currentSpeed, meta.from, meta.to, false);
        this.currentAnimationGroup.pause();
      }
      
      this.currentAnimationGroup.goToFrame(targetFrame);
      this._lastKnownFrame = targetFrame;

      if (this.audioElement && meta.durationSec > 0) {
        this.audioElement.currentTime = meta.durationSec * normalizedPos;
      }
    });

    this.speedSelect.addEventListener('change', (e) => {
      const speed = Number(e.target.value) || 1;
      this.animationGroups.forEach(g => g.speedRatio = speed);
      if (this.audioElement) this.audioElement.playbackRate = speed;
    });

    this.scene.onBeforeRenderObservable.add(() => this.updateTimeline());
  }

  // Animation helpers
  getMetaFromGroup(g) {
    let fps = 60;
    if (g.targetedAnimations?.length > 0) {
      const anim = g.targetedAnimations[0].animation;
      if (anim && typeof anim.framePerSecond === 'number' && anim.framePerSecond > 0) {
        fps = anim.framePerSecond;
      }
    }
    const from = g.from ?? 0;
    const to = g.to ?? 0;
    const durationSec = Math.max(0, (to - from) / fps);
    return { from, to, fps, durationSec };
  }

  getCurrentMeta() {
    const i = this.animationGroups.indexOf(this.currentAnimationGroup);
    return i >= 0 ? this.animMetas[i] : null;
  }

  _primeCurrentGroup() {
    const g = this.currentAnimationGroup;
    if (!g) return;

    if (!g.animatables || g.animatables.length === 0) {
      g.reset();
      const currentSpeed = Number(this.speedSelect.value) || 1;
      g.start(false, currentSpeed); 
      g.pause();     
      const meta = this.getCurrentMeta();
      if (meta) this._lastKnownFrame = meta.from;
    }
  }

  getCurrentFrame() {
    if (!this.currentAnimationGroup) return 0;

    const g = this.currentAnimationGroup;

    const a = g.animatables && g.animatables[0];
    if (a && typeof a.masterFrame === 'number') {
      this._lastKnownFrame = a.masterFrame;
      return a.masterFrame;
    }

    return this._lastKnownFrame || (this.getCurrentMeta()?.from ?? 0);
  }

  updateTimeline() {
    if (!this.currentAnimationGroup || this.isScrubbing) return;

    const meta = this.getCurrentMeta();
    if (!meta) return;

    const cur = this.getCurrentFrame();
    const total = (meta.to - meta.from) || 1;
    const tNorm = Math.min(1, Math.max(0, (cur - meta.from) / total));

    if (this.timelineSlider) {
      this.timelineSlider.value = String(tNorm * 1000);
    }
  }

  // Public API
  setAnimations(animationGroups) {
    this.animationGroups = animationGroups || [];
    this.animMetas = this.animationGroups.map(g => this.getMetaFromGroup(g));

    this.animationSelect.innerHTML = "";
    if (this.animationGroups.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No animations available";
      this.animationSelect.appendChild(opt);
      this.animationSelect.disabled = true;
      this.currentAnimationGroup = null;
      return;
    }

    this.animationGroups.forEach((group, index) => {
      const opt = document.createElement("option");
      opt.value = String(index);
      opt.textContent = group.name || `Animation ${index + 1}`;
      this.animationSelect.appendChild(opt);
    });

    this.animationSelect.disabled = false;

    this.currentAnimationGroup = this.animationGroups[0];
    this.currentAnimationGroup.reset();
    this.isPlaying = false;
    this.timelineSlider.value = '0';

    this._primeCurrentGroup();

    const meta = this.animMetas[0];
    if (meta) {
      this._lastKnownFrame = meta.from;
      console.log(`Animation: ${this.currentAnimationGroup.name || 'Clip 1'}`);
      console.log(`Frames: ${meta.from}..${meta.to}, FPS: ${meta.fps}, Duration: ${meta.durationSec.toFixed(2)}s`);
    }
  }

  setAudio(audioUrl) {
    this.audioElement = new Audio(audioUrl);
    this.audioElement.preload = "auto";
    console.log("Audio loaded:", audioUrl);
  }

  setupEventListeners() {
    // Animation select
    this.animationSelect.addEventListener("change", (e) => {
      const index = Number(e.target.value);
      if (!Number.isFinite(index) || !this.animationGroups[index]) return;

      if (this.currentAnimationGroup) {
        this.currentAnimationGroup.stop();
      }

      this.currentAnimationGroup = this.animationGroups[index];
      this.currentAnimationGroup.reset();
      this.isPlaying = false;

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }

      this.timelineSlider.value = '0';
      this._primeCurrentGroup();

      const meta = this.animMetas[index];
      if (meta) this._lastKnownFrame = meta.from;

      console.log(`Switched to: ${this.currentAnimationGroup.name || `Animation ${index+1}`}, Duration: ${meta?.durationSec.toFixed(2)}s`);
    });

    this.playBtn.addEventListener("click", () => {
      if (!this.currentAnimationGroup) return;

      const speed = Number(this.speedSelect.value) || 1;
      this.animationGroups.forEach(g => g.speedRatio = speed);

      this.currentAnimationGroup.play(false);
      this.isPlaying = true;

      if (this.audioElement) {
        this.audioElement.playbackRate = speed;
        this.audioElement.play().catch(err => console.warn("Audio play failed:", err));
      }
    });

    this.pauseBtn.addEventListener("click", () => {
      if (this.currentAnimationGroup) {
        this.currentAnimationGroup.pause();
        this.isPlaying = false;
      }
      if (this.audioElement) this.audioElement.pause();
    });

    this.resetBtn.addEventListener("click", () => {
      if (this.currentAnimationGroup) {
        this.currentAnimationGroup.stop();
        this.currentAnimationGroup.reset();
        this.isPlaying = false;

        this._primeCurrentGroup();

        const meta = this.getCurrentMeta();
        if (meta) this._lastKnownFrame = meta.from;
      }
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      this.timelineSlider.value = '0';
    });
  }

  /**
   * Cleanup method to dispose audio and remove dynamically created controls
   */
  dispose() {
    // Stop and cleanup audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.src = ''; // Release the audio file
      this.audioElement = null;
      console.log(' Audio element disposed');
    }

    // Remove dynamically created controls (timeline and speed selector)
    if (this.timelineSlider && this.timelineSlider.parentElement) {
      this.timelineSlider.parentElement.remove();
      console.log(' Timeline controls removed');
    }

    // Stop all animations
    if (this.currentAnimationGroup) {
      this.currentAnimationGroup.stop();
      this.currentAnimationGroup = null;
    }

    // Clear references
    this.animationGroups = [];
    this.animMetas = [];
    this.isPlaying = false;
    this.isScrubbing = false;

    console.log(' AnimationControls disposed');
  }

  showControls() { if (this.controls) this.controls.style.display = 'block'; }
  hideControls() { if (this.controls) this.controls.style.display = 'none'; }
}

export class Controls {
  constructor() {
    this.state = {
      forward: false,
      back: false,
      left: false,
      right: false,
      signalLeft: false,
      signalRight: false,
      reset: false,
    };

    this._pausePressed = false;

    const keyMap = {
      KeyW: 'forward',   ArrowUp: 'forward',
      KeyS: 'back',      ArrowDown: 'back',
      KeyA: 'left',      ArrowLeft: 'left',
      KeyD: 'right',     ArrowRight: 'right',
      KeyQ: 'signalLeft',
      KeyE: 'signalRight',
      KeyR: 'reset',
    };

    this._onKeyDown = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this._pausePressed = true;
        e.preventDefault();
        return;
      }
      const action = keyMap[e.code];
      if (action) {
        if (action === 'signalLeft') {
          this.state.signalLeft = !this.state.signalLeft;
          if (this.state.signalLeft) this.state.signalRight = false;
        } else if (action === 'signalRight') {
          this.state.signalRight = !this.state.signalRight;
          if (this.state.signalRight) this.state.signalLeft = false;
        } else {
          this.state[action] = true;
        }
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => {
      const action = keyMap[e.code];
      if (action && action !== 'signalLeft' && action !== 'signalRight') {
        this.state[action] = false;
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  consumePause() {
    const v = this._pausePressed;
    this._pausePressed = false;
    return v;
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}

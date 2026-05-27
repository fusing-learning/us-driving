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

    const keyMap = {
      KeyW: 'forward',   ArrowUp: 'forward',
      KeyS: 'back',      ArrowDown: 'back',
      KeyA: 'left',      ArrowLeft: 'left',
      KeyD: 'right',     ArrowRight: 'right',
      KeyQ: 'signalLeft',
      KeyE: 'signalRight',
      KeyR: 'reset',
    };

    document.addEventListener('keydown', e => {
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
    });
    document.addEventListener('keyup', e => {
      const action = keyMap[e.code];
      if (action && action !== 'signalLeft' && action !== 'signalRight') {
        this.state[action] = false;
      }
    });
  }
}

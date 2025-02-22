/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {MDCFoundation} from '@material/base/foundation';
import {MDCCheckboxAdapter} from './adapter';
import {cssClasses, numbers, strings} from './constants';

export class MDCCheckboxFoundation extends MDCFoundation<MDCCheckboxAdapter> {
  static get cssClasses() {
    return cssClasses;
  }

  static get strings() {
    return strings;
  }

  static get numbers() {
    return numbers;
  }

  static get defaultAdapter(): MDCCheckboxAdapter {
    return {
      addClass: () => undefined,
      forceLayout: () => undefined,
      hasNativeControl: () => false,
      isAttachedToDOM: () => false,
      isChecked: () => false,
      isIndeterminate: () => false,
      removeClass: () => undefined,
      removeNativeControlAttr: () => undefined,
      setChecked: () => undefined,
      setNativeControlAttr: () => undefined,
      setNativeControlDisabled: () => undefined,
    };
  }

  private currentCheckState_ = strings.TRANSITION_STATE_INIT;
  // Native checkboxes can only have two real states: checked/true or unchecked/false
  // The indeterminate state is visual only.
  // See https://stackoverflow.com/a/33529024 for more details.
  private realCheckState_ = false;
  private currentAnimationClass_ = '';
  private animEndLatchTimer_ = 0;
  private enableAnimationEndHandler_ = false;

  constructor(adapter?: Partial<MDCCheckboxAdapter>) {
    super({...MDCCheckboxFoundation.defaultAdapter, ...adapter});
  }

  init() {
    this.currentCheckState_ = this.determineCheckState_();
    this.realCheckState_ = this.adapter_.isChecked();
    this.updateAriaChecked_();
    this.adapter_.addClass(cssClasses.UPGRADED);
  }

  destroy() {
    clearTimeout(this.animEndLatchTimer_);
  }

  setDisabled(disabled: boolean) {
    this.adapter_.setNativeControlDisabled(disabled);
    if (disabled) {
      this.adapter_.addClass(cssClasses.DISABLED);
    } else {
      this.adapter_.removeClass(cssClasses.DISABLED);
    }
  }

  /**
   * Handles the animationend event for the checkbox
   */
  handleAnimationEnd() {
    if (!this.enableAnimationEndHandler_) {
      return;
    }

    clearTimeout(this.animEndLatchTimer_);

    this.animEndLatchTimer_ = setTimeout(() => {
      this.adapter_.removeClass(this.currentAnimationClass_);
      this.enableAnimationEndHandler_ = false;
    }, numbers.ANIM_END_LATCH_MS);
  }

  /**
   * Handles the click event for the checkbox
   */
  handleClick() {
    // added for IE browser to fix compatibility issue:
    // https://github.com/material-components/material-components-web/issues/4893
    const {TRANSITION_STATE_INDETERMINATE} = strings;
    if (this.currentCheckState_ === TRANSITION_STATE_INDETERMINATE) {
      this.adapter_.setChecked(!this.realCheckState_);
    }
    this.transitionCheckState_();
  }

  /**
   * Handles the actions after check status changes
   */
  handleChange() {
    this.transitionCheckState_();
  }

  private transitionCheckState_() {
    if (!this.adapter_.hasNativeControl()) {
      return;
    }
    const oldState = this.currentCheckState_;
    const newState = this.determineCheckState_();

    if (oldState === newState) {
      return;
    }

    this.updateAriaChecked_();

    const {TRANSITION_STATE_UNCHECKED} = strings;
    const {TRANSITION_STATE_CHECKED} = strings;
    const {SELECTED} = cssClasses;
    if (newState === TRANSITION_STATE_UNCHECKED) {
      this.adapter_.removeClass(SELECTED);
      this.realCheckState_ = false;
    } else {
      this.adapter_.addClass(SELECTED);
      if (newState === TRANSITION_STATE_CHECKED) {
        this.realCheckState_ = true;
      }
    }

    // Check to ensure that there isn't a previously existing animation class, in case for example
    // the user interacted with the checkbox before the animation was finished.
    if (this.currentAnimationClass_.length > 0) {
      clearTimeout(this.animEndLatchTimer_);
      this.adapter_.forceLayout();
      this.adapter_.removeClass(this.currentAnimationClass_);
    }

    this.currentAnimationClass_ = this.getTransitionAnimationClass_(oldState, newState);
    this.currentCheckState_ = newState;

    // Check for parentNode so that animations are only run when the element is attached
    // to the DOM.
    if (this.adapter_.isAttachedToDOM() && this.currentAnimationClass_.length > 0) {
      this.adapter_.addClass(this.currentAnimationClass_);
      this.enableAnimationEndHandler_ = true;
    }
  }

  private determineCheckState_(): string {
    const {
      TRANSITION_STATE_INDETERMINATE,
      TRANSITION_STATE_CHECKED,
      TRANSITION_STATE_UNCHECKED,
    } = strings;

    if (this.adapter_.isIndeterminate()) {
      return TRANSITION_STATE_INDETERMINATE;
    }
    return this.adapter_.isChecked() ? TRANSITION_STATE_CHECKED : TRANSITION_STATE_UNCHECKED;
  }

  private getTransitionAnimationClass_(oldState: string, newState: string): string {
    const {
      TRANSITION_STATE_INIT,
      TRANSITION_STATE_CHECKED,
      TRANSITION_STATE_UNCHECKED,
    } = strings;

    const {
      ANIM_UNCHECKED_CHECKED,
      ANIM_UNCHECKED_INDETERMINATE,
      ANIM_CHECKED_UNCHECKED,
      ANIM_CHECKED_INDETERMINATE,
      ANIM_INDETERMINATE_CHECKED,
      ANIM_INDETERMINATE_UNCHECKED,
    } = MDCCheckboxFoundation.cssClasses;

    switch (oldState) {
      case TRANSITION_STATE_INIT:
        if (newState === TRANSITION_STATE_UNCHECKED) {
          return '';
        }
        return newState === TRANSITION_STATE_CHECKED ? ANIM_INDETERMINATE_CHECKED : ANIM_INDETERMINATE_UNCHECKED;
      case TRANSITION_STATE_UNCHECKED:
        return newState === TRANSITION_STATE_CHECKED ? ANIM_UNCHECKED_CHECKED : ANIM_UNCHECKED_INDETERMINATE;
      case TRANSITION_STATE_CHECKED:
        return newState === TRANSITION_STATE_UNCHECKED ? ANIM_CHECKED_UNCHECKED : ANIM_CHECKED_INDETERMINATE;
      default: // TRANSITION_STATE_INDETERMINATE
        return newState === TRANSITION_STATE_CHECKED ? ANIM_INDETERMINATE_CHECKED : ANIM_INDETERMINATE_UNCHECKED;
    }
  }

  private updateAriaChecked_() {
    // Ensure aria-checked is set to mixed if checkbox is in indeterminate state.
    if (this.adapter_.isIndeterminate()) {
      this.adapter_.setNativeControlAttr(
          strings.ARIA_CHECKED_ATTR, strings.ARIA_CHECKED_INDETERMINATE_VALUE);
    } else {
      // The on/off state does not need to keep track of aria-checked, since
      // the screenreader uses the checked property on the checkbox element.
      this.adapter_.removeNativeControlAttr(strings.ARIA_CHECKED_ATTR);
    }
  }
}

// tslint:disable-next-line:no-default-export Needed for backward compatibility with MDC Web v0.44.0 and earlier.
export default MDCCheckboxFoundation;

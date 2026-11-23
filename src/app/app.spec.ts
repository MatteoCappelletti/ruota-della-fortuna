import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { Wheel } from './features/wheel/wheel';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('switches themes and restores the selected theme from local storage', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const themeSwitch = compiled.querySelector<HTMLButtonElement>('.theme-switch')!;

    expect(themeSwitch.getAttribute('aria-checked')).toBe('false');
    themeSwitch.click();
    fixture.detectChanges();

    expect(themeSwitch.getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('fortuna-wheel-theme')).toBe('dark');

    fixture.destroy();
    const restoredFixture = TestBed.createComponent(App);
    restoredFixture.detectChanges();

    expect(
      (restoredFixture.nativeElement as HTMLElement)
        .querySelector('.theme-switch')
        ?.getAttribute('aria-checked'),
    ).toBe('true');
    restoredFixture.destroy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render the wheel and the options list', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Gira la ruota.');
    expect(compiled.querySelectorAll('.entry-row').length).toBe(6);
    expect(compiled.querySelector('app-wheel')).toBeTruthy();
    expect(
      Array.from(compiled.querySelector('.workspace')!.children).map((panel) => panel.classList[0]),
    ).toEqual(['winner-panel', 'wheel-panel', 'side-column']);
  });

  it('saves the current options and restores them from local storage', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const input = compiled.querySelector<HTMLInputElement>('#new-entry')!;
    input.value = 'Nuova opzione';
    input.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLFormElement>('.add-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.save-button')!.click();
    fixture.detectChanges();

    expect(localStorage.getItem('fortuna-wheel-entries')).toContain('Nuova opzione');

    compiled.querySelector<HTMLButtonElement>('.remove-button')!.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.text-button')!.click();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.entry-row').length).toBe(7);
    expect(compiled.textContent).toContain('Lista salvata ripristinata.');
  });

  it('spins in the drag direction and selects the sector under the pointer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const entries = Array.from(compiled.querySelectorAll('.entry-name')).map((element) =>
      element.textContent!.trim(),
    );

    fixture.debugElement
      .query(By.directive(Wheel))
      .triggerEventHandler('dragSpinRequested', { rotationDelta: 42, velocity: 600 });
    fixture.detectChanges();

    const transform = compiled.querySelector('.wheel-rotation')!.getAttribute('style')!;
    const rotation = Number(transform.match(/rotate\(([-\d.]+)/)?.[1]);
    const duration = Number(transform.match(/transition-duration:\s*([\d.]+)ms/)?.[1]);
    const pointerAngle = ((-rotation % 360) + 360) % 360;
    const selectedEntry = entries[Math.floor(pointerAngle / (360 / entries.length))];

    expect(rotation).toBeGreaterThan(0);
    expect(duration).toBeLessThan(3600);
    expect(compiled.querySelector('.spin-button')?.hasAttribute('disabled')).toBe(true);

    compiled.querySelector('.wheel-rotation')!.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    expect(compiled.querySelector('#winner-popup-title')?.textContent).toBe(selectedEntry);
    compiled.querySelector<HTMLButtonElement>('.popup-confirm')!.click();
    fixture.detectChanges();

    fixture.debugElement
      .query(By.directive(Wheel))
      .triggerEventHandler('dragSpinRequested', { rotationDelta: 42, velocity: 1200 });
    fixture.detectChanges();
    const fasterDuration = Number(
      compiled.querySelector('.wheel-rotation')!.getAttribute('style')!
        .match(/transition-duration:\s*([\d.]+)ms/)?.[1],
    );

    expect(fasterDuration).toBeLessThan(duration);
  });

  it('removes the selected winner before spinning again', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('.spin-button')!.click();
    fixture.detectChanges();
    compiled.querySelector('.wheel-rotation')!.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    expect(compiled.querySelector('.winner-popup h2')?.textContent?.trim()).toBeTruthy();
    expect(compiled.querySelector('.winner-panel h2')?.textContent).toContain('Storico');
    expect(compiled.querySelectorAll('.winner-history li')).toHaveLength(1);
    expect(compiled.querySelector('.winner-history li .history-index')?.textContent?.trim()).toBe('01');
    expect(compiled.querySelector('.wheel-panel > .spin-button')).toBeFalsy();
    expect(compiled.querySelectorAll('.winner-actions button').length).toBe(2);
    expect(compiled.querySelector('.winner-actions .spin-button')?.textContent).toContain('Gira la ruota');
    const firstWinner = compiled.querySelector('.winner-popup h2')!.textContent;
    compiled.querySelector<HTMLButtonElement>('.popup-confirm')!.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.winner-popup')).toBeFalsy();
    expect(compiled.querySelector('.winner-history li')?.textContent).toContain(firstWinner);

    compiled.querySelector<HTMLButtonElement>('.exclude-button')!.click();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.entry-row').length).toBe(5);
    expect(compiled.querySelector('.winner-popup')).toBeFalsy();
    compiled.querySelector('.wheel-rotation')!.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.winner-history li')).toHaveLength(2);
    expect(compiled.querySelector('.winner-history li.latest-winner')?.textContent)
      .toContain(compiled.querySelector('.winner-popup h2')?.textContent);
    expect(compiled.querySelector('.winner-history li.latest-winner .history-index')?.textContent?.trim())
      .toBe('02');
    expect(compiled.querySelector('.winner-history li:not(.latest-winner) .history-index')?.textContent?.trim())
      .toBe('01');
  });
});

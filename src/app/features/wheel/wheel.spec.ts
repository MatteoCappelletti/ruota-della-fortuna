import { TestBed } from '@angular/core/testing';
import { Wheel } from './wheel';

describe('Wheel', () => {
  it('keeps dense labels radial and shortens long labels without losing their full title', async () => {
    await TestBed.configureTestingModule({
      imports: [Wheel],
    }).compileComponents();

    const fixture = TestBed.createComponent(Wheel);
    const longName = 'supercalifragilisticexpialidocious';
    fixture.componentRef.setInput('entries', [
      'Franco',
      'Ciccio',
      'Markez',
      'Fort',
      'Giunsite',
      longName,
      'Luigi',
      'Mike',
      'Pia',
      'Sigma',
      'Marco',
      'Luca',
    ]);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('text')) as SVGTextElement[];
    const longLabel = labels.find((label) => label.getAttribute('aria-label') === longName);
    const rotations = labels.map((label) => Number(label.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1]));

    expect(labels).toHaveLength(12);
    expect(longLabel?.textContent).toContain('…');
    expect(longLabel?.querySelector('title')?.textContent).toBe(longName);
    expect(rotations.every((rotation) => Math.abs(rotation) <= 90)).toBe(true);
  });
});

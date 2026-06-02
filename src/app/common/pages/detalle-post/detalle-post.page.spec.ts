import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetallePostPage } from './detalle-post.page';

describe('DetallePostPage', () => {
  let component: DetallePostPage;
  let fixture: ComponentFixture<DetallePostPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetallePostPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

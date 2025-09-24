import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { Admin } from './admin';
import { ChatService } from '../chat/chat.service';
import { DeleteMessageService } from '../chat/delete-message.service';
import { modifyMessageService } from '../chat/modify-message.service';
import { AddPhotoService } from '../chat/add-photo.service';
import { DeletePhotoService } from '../chat/delete-photo.service';
import { AddVideoService } from '../chat/add-video.service';
import { DeleteVideoService } from '../chat/delete-video.service';

class ChatServiceMock {
  private subject = new Subject<any>()

  connect(): boolean {
    return true
  }

  stream() {
    return this.subject.asObservable()
  }

  disconnect(): void {
  }

  getHistoryWithPeer() {
    return of({ messages: [] })
  }

  send(): boolean {
    return true
  }
}

class DeleteMessageServiceMock {
  deleteMessage(): Promise<void> {
    return Promise.resolve()
  }
}

class ModifyMessageServiceMock {
  modifyMessage(): Promise<any> {
    return Promise.resolve({ updatedAt: new Date().toISOString() })
  }
}

class AddPhotoServiceMock {
  addPhoto(): Promise<any> {
    return Promise.resolve({ url: 'http://localhost/test.jpg', _id: 'photo123' })
  }
}

class DeletePhotoServiceMock {
  deletePhoto(): Promise<void> {
    return Promise.resolve()
  }
}

class AddVideoServiceMock {
  addVideo(): Promise<any> {
    return Promise.resolve({ url: 'http://localhost/test.mp4', _id: 'video123', name: 'test.mp4' })
  }
}

class DeleteVideoServiceMock {
  deleteVideo(): Promise<void> {
    return Promise.resolve()
  }
}

describe('Admin', () => {
  let component: Admin
  let fixture: ComponentFixture<Admin>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, Admin],
      providers: [
        { provide: ChatService, useClass: ChatServiceMock },
        { provide: DeleteMessageService, useClass: DeleteMessageServiceMock },
        { provide: modifyMessageService, useClass: ModifyMessageServiceMock },
        { provide: AddPhotoService, useClass: AddPhotoServiceMock },
        { provide: DeletePhotoService, useClass: DeletePhotoServiceMock },
        { provide: AddVideoService, useClass: AddVideoServiceMock },
        { provide: DeleteVideoService, useClass: DeleteVideoServiceMock }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(Admin)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})

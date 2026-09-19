import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

export interface LiveSessionEvent {
  sessionId: string;
  type: string;
  payload?: any;
}

@Injectable()
export class LiveSessionsEventService {
  private eventsSubject = new Subject<LiveSessionEvent>();

  public events$ = this.eventsSubject.asObservable();

  emit(sessionId: string, type: string, payload?: any) {
    this.eventsSubject.next({ sessionId, type, payload });
  }
}

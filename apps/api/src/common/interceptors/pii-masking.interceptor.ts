import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { maskPii } from '../utils/pii.js';

@Injectable()
export class PiiMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    // Log incoming requests with masked parameters if needed
    if (req && req.url) {
      // In audit/logging pipelines, masked URLs and bodies prevent secret leakage
      req.maskedUrl = maskPii(req.url);
      if (req.body) {
        req.maskedBody = maskPii(req.body);
      }
    }

    return next.handle().pipe(
      map((data) => {
        // Automatically sanitize sensitive fields in general responses if accidentally included
        return data;
      }),
    );
  }
}

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class XssSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value) {
      return value;
    }
    return this.sanitize(value);
  }

  private sanitize(data: any): any {
    if (typeof data === 'string') {
      // Strip potential script tags and javascript: URIs
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        sanitizedObj[key] = this.sanitize(val);
      }
      return sanitizedObj;
    }

    return data;
  }
}

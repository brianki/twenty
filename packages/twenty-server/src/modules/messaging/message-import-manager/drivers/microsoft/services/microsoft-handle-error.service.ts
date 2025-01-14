import { Injectable } from '@nestjs/common';

import { GraphError } from '@microsoft/microsoft-graph-client';

import {
  MessageImportDriverException,
  MessageImportDriverExceptionCode,
} from 'src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception';

@Injectable()
export class MicrosoftHandleErrorService {
  public handleMicrosoftMessageListFetchError(error: GraphError): never {
    if (error.statusCode === 401) {
      throw new MessageImportDriverException(
        'Unauthorized access to Microsoft Graph API',
        MessageImportDriverExceptionCode.UNAUTHORIZED,
      );
    }

    if (error.statusCode === 403) {
      throw new MessageImportDriverException(
        'Forbidden access to Microsoft Graph API',
        MessageImportDriverExceptionCode.FORBIDDEN,
      );
    }

    throw new MessageImportDriverException(
      `Microsoft Graph API error: ${error.message}`,
      MessageImportDriverExceptionCode.UNKNOWN,
    );
  }
}

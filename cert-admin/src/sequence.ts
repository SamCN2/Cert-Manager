/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {inject} from '@loopback/context';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import {rateLimiter} from './middleware/rate-limiter.middleware';

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;

      // Apply rate limiting for email verification endpoints
      if (request.path.includes('/verify-email')) {
        await rateLimiter(context, async () => {});
      }

      const route = this.findRoute(request);
      const args = await this.parseParams(request, route);
      
      try {
        const result = await this.invoke(route, args);
        this.send(response, result);
      } catch (invokeError) {
        console.error('Error in invoke method:', invokeError);
        console.error('Error stack:', invokeError.stack);
        throw invokeError;
      }
    } catch (err) {
      console.error('Error in sequence:', err);
      console.error('Error stack:', err.stack);
      this.reject(context, err);
    }
  }
}

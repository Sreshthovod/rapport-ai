import { validateWhatsAppDOM } from './parser.js';
import { WhatsAppDOMValidationResult } from './types.js';
import { Logger } from './utils.js';

let lastLoggedOutput: string | null = null;

export function inspectWhatsAppDOM(logger?: Logger): WhatsAppDOMValidationResult {
  const result = validateWhatsAppDOM(logger);

  const statusStr = result.connected ? 'CONNECTED' : 'DISCONNECTED';
  const chatStr = result.chatFound ? 'FOUND' : 'MISSING';
  const inputStr = result.inputFound ? 'FOUND' : 'MISSING';
  const containerStr = result.messageContainerFound ? 'FOUND' : 'MISSING';
  const messagesStr = result.messagesFound ? 'FOUND' : 'MISSING';

  const output = [
    '[WhatsApp DOM Inspector]',
    `Chat Title: ${chatStr}`,
    `Input: ${inputStr}`,
    `Message Container: ${containerStr}`,
    `Messages: ${messagesStr}`,
    '',
    'STATUS:',
    statusStr,
  ].join('\n');

  if (output !== lastLoggedOutput) {
    lastLoggedOutput = output;
    console.log(output);
  }

  return result;
}

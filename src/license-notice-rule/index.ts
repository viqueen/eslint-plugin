/**
 * Copyright 2023 Hasnae Rehioui
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Rule } from 'eslint';
import * as ESTree from 'estree';

const supported = new Set(['Apache-2.0']);

const getFileHeader = (context: Rule.RuleContext, node: ESTree.Program) => {
    const comments = context.sourceCode.getCommentsBefore(node);
    const header = comments.find(
        (comment) => comment.type === 'Block' || comment.type === 'Line'
    );
    return {
        header
    };
};

const generateLicenseHeader = ({
    license,
    copyRightName,
    copyRightYear
}: {
    license: string;
    copyRightYear: string;
    copyRightName: string;
}): string => {
    const text = fs
        .readFileSync(path.resolve(__dirname, `${license}-license.js.txt`))
        .toString();
    return text
        .replace('{{copyRightYear}}', copyRightYear)
        .replace('{{copyRightName}}', copyRightName);
};

const handleProgram = (context: Rule.RuleContext) => (node: ESTree.Program) => {
    const [definition] = context.options;
    if (!definition) {
        context.report({
            node,
            message: 'missing license-notice configuration'
        });
        return;
    }
    const { license, copyRightYear, copyRightName } = definition;
    if (!license || !copyRightYear || !copyRightName) {
        context.report({
            node,
            message: 'invalid license-notice configuration'
        });
        return;
    }
    if (!supported.has(license)) {
        context.report({
            node,
            message: 'unsupported license'
        });
        return;
    }

    // handle (t|j)sx? files for now
    const pattern = /^.*\.([tj])sx?$/;
    if (!context.filename.match(pattern)) return;

    const { header } = getFileHeader(context, node);
    if (!header) {
        context.report({
            node,
            messageId: 'missingLicenseNotice',
            data: {
                license,
                copyRightYear,
                copyRightName
            },
            fix: (fixer) => {
                return fixer.insertTextBefore(
                    node,
                    generateLicenseHeader({
                        license,
                        copyRightYear,
                        copyRightName
                    })
                );
            }
        });
    }
};

const licenseNoticeRule = () => {
    return {
        key: 'license-notice',
        rule: {
            meta: {
                docs: {
                    description: 'include license notice header'
                },
                fixable: 'code',
                schema: [
                    {
                        type: 'object',
                        properties: {
                            license: { type: 'string' },
                            copyRightYear: { type: 'string ' },
                            copyRightName: { type: 'string' }
                        }
                    }
                ],
                messages: {
                    missingLicenseNotice:
                        'missing {{license}} copy-right ({{copyRightYear}}, {{copyRightName}}) license notice header'
                }
            },
            create(context: Rule.RuleContext): Rule.RuleListener {
                return {
                    Program: handleProgram(context)
                };
            }
        }
    };
};

export { licenseNoticeRule };

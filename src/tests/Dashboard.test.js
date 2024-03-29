/*
 * Copyright (C) 2021 Inria
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Alexandre Abadie <alexandre.abadie@inria.fr>
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import WS from 'jest-websocket-mock';

import Dashboard from '../Dashboard';

const server = setupServer(
    rest.get('/jobs', (req, res, ctx) => {
        const limit = req.url.searchParams.get('limit')
        let finished = [
            {
                "uid": "123",
                "output_url": "https://ci.riot-os.org/RIOT-OS/RIOT/16620/951822c41b34cf62ed29ab58ed1e34cbbcd3894b/output.html",
                "state": "passed",
                "runtime": 2392.292683839798,
                "status": {},
                "commit": {
                    "sha": "951822c41b34cf62ed29ab58ed1e34cbbcd3894b",
                    "author": "MrKevinWeiss",
                },
                "prinfo": {
                    "title": "drivers/sx126x: fix netdev send and recv function [backport 2021.07]",
                    "user": "MrKevinWeiss",
                    "number": "16620",
                    "url": "https://github.com/RIOT-OS/RIOT/pull/16620",
                },
                "creation_time": 1625648719.7717128
            },
            {
                "uid": "1234",
                "output_url": "https://ci.riot-os.org/RIOT-OS/RIOT/15030/1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0/output.html",
                "state": "errored",
                "runtime": 2488.577573299408,
                "status": {
                    "failed_jobs": [
                        {
                            "name": "builds/tests/driver_sx127x/samr21-xpro:gnu",
                            "href": "https://ci.riot-os.org/RIOT-OS/RIOT/15030/1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0/output/builds/tests/driver_sx127x/samr21-xpro:gnu.txt"
                        }
                    ]
                },
                "commit": {
                    "sha": "1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0",
                    "author": "jia200x",
                },
                "prinfo": {
                    "title": "drivers/sx127x: remove ZTIMER_USEC dependency",
                    "user": "jia200x",
                    "number": "15030",
                    "url": "https://github.com/RIOT-OS/RIOT/pull/15030",
                },
                "creation_time": 1625238690.1669567
            },
        ]
        return res(ctx.json(
            {
                "running": [
                    {
                        "uid": "12345",
                        "commit": {
                            "sha": "5ef4c0a778ab7d4f625d63fdafe5e8347bfe479d",
                            "author": "MrKevinWeiss",
                        },
                        "prinfo": {
                            "title": "netdev/lora: fix size of NETOPT_RX_SYMBOL_TIMEOUT [backport 2021.07]",
                            "user": "MrKevinWeiss",
                            "number": "16621",
                            "url": "https://github.com/RIOT-OS/RIOT/pull/16621",
                        },
                        "state": "running",
                        "creation_time": 1625648720.3770814
                    }
                ],
                "queued": [
                    {
                        "uid": "123456",
                        "commit": {
                            "sha": "13274da74ab861830ed4f1216aceccf50548b27d",
                            "author": "jia200x",
                        },
                        "prinfo": {
                            "title": "gnrc_lorawan: fix gnrc_pktbuf_release_error (introduced by #16080) [backport 2021.07",
                            "user": "jia200x",
                            "number": "16622",
                            "url": "https://github.com/RIOT-OS/RIOT/pull/16622",
                        },
                        "state": "queued",
                        "creation_time": 1625646859.5628495
                    }
                ],
                "finished": finished.slice(0, limit)
            }
        ));
    })
)

const wsServer = new WS("ws://localhost:1234/ws/status");

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetch and display pull requests', async () => {
    render(<Dashboard />);
    await screen.findByText((content, element) => {
        return element.className === "card m-2 border-info";
    });
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-warning";
    })).toBeDefined();
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-info";
    })).toBeDefined();
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-success";
    })).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "card m-2 border-danger";
    })).toBeNull();

    expect(await screen.findByText('Show more')).toBeInTheDocument();
    fireEvent.click(await screen.findByText('Show more'));
    await screen.findByText((content, element) => {
        return element.className === "card m-2 border-danger";
    });

    await waitFor(() => wsServer.send('{"cmd": "reload"}'));
    await screen.findByText((content, element) => {
        return element.className === "card m-2 border-info";
    });
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-warning";
    })).toBeDefined();
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-info";
    })).toBeDefined();
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-success";
    })).toBeDefined();
    expect(await screen.findByText((content, element) => {
        return element.className === "card m-2 border-danger";
    })).toBeDefined();

    // send pr_status command via websocket
    await waitFor(() => wsServer.send('{"cmd" : "status", "uid" : "12345", "status" : {"status": "working"}}'));
    expect(await screen.findByText("working")).toBeDefined();

    // smoke test to trigger the websocket client on close callback function
    await waitFor(() => wsServer.close());
})

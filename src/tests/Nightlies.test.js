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
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import Nightlies from '../Nightlies';

const server = setupServer(
    rest.get('/master/nightlies.json', (req, res, ctx) => {
        return res(ctx.json(
            [
                {
                    "commit": "13eb3f05c533385f3146c2417b44eaeb12f584e8",
                    "result": "errored",
                    "creation_time": 1623550884.0
                },
                {
                    "commit": "90dd3deb2165f64fecab6974f5fc1326e63165cd",
                    "result": "success",
                    "creation_time": 1623292442.0
                }
            ]
        ));
    })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetch and display basic nightlies', async () => {
    render(<Nightlies />);
    await screen.findByText('master');

    const dateErrored = new Date(1623550884.0 * 1000);
    expect(await screen.findByText(`${dateErrored.toLocaleString()}`)).toBeInTheDocument();

    const dateSuccess = new Date(1623292442.0 * 1000);
    const dateSuccessString = `${dateSuccess.toLocaleString()}`
    await expect(screen.findByText(dateSuccessString)).rejects.toThrowError("Unable to find an element with the text");
    expect(await screen.findByText('Show more')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show more'));
    await screen.findByText(dateSuccessString);
})

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

import axios from 'axios';
import moment from 'moment';

import {
    cardColor, cardIcon, textColor, stateText, murdockHttpBaseUrl
} from './constants';
import { DateShortElem } from './components';


export const JobItem = (props) => {
    const jobDate = new Date(props.job.creation_time * 1000);

    const refRepr = (ref) => {
        if (ref && ref.startsWith("refs/")) {
            return `${ref.split("/").slice(2).join("/")}`
        }
        return ref.substring(0, 15);
    };

    let jobContext = "";
    if (props.job.prinfo) {
        jobContext = `(PR #${props.job.prinfo.number})`;
    } else {
        jobContext = `(${refRepr(props.job.ref)})`;
    }

    const removeJob = (type) => {
        axios.delete(
            `${murdockHttpBaseUrl}/job/${props.job.uid}`,
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            const action = (type === "queued") ? "Cancelling" : "Stopping";
            props.notify(props.job.uid, "info", `${action} job ${props.job.uid.substring(0, 7)} ${jobContext}`)
        })
        .catch(error => {
            const action = (type === "queued") ? "cancel" : "abort";
            props.notify(props.job.uid, "danger", `Failed to ${action} job ${props.job.uid.substring(0, 7)} ${jobContext}`)
            console.log(error);
        });
    };

    const cancel = () => {
        console.log(`Canceling queued job ${props.job.commit.sha} ${jobContext}`)
        removeJob("queued");
    };

    const abort = () => {
        console.log(`Stopping running job ${props.job.commit.sha} ${jobContext}`)
        removeJob("running");
    };

    const restart = () => {
        console.log(`Restarting job ${props.job.commit.sha} ${jobContext}`)
        axios.post(
            `${murdockHttpBaseUrl}/job/${props.job.uid}`, {},
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(res => {
            props.notify(props.job.uid, "info", `Job ${res.data.uid.substring(0, 7)} ${jobContext} started`);
        })
        .catch(error => {
            props.notify(props.job.uid, "danger", `Failed to restart job ${props.job.uid.substring(0, 7)} ${jobContext}`)
            console.log(error);
        });
    };

    const cancelAction = (props.permissions === "push" && props.job.state === "queued") && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={cancel}>
                <i className="bi-x-circle me-1"></i><span>Cancel</span>
            </button>
        </li>
    );

    const stopAction = (props.permissions === "push" && props.job.state === "running") && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={abort}>
                <i className="bi-x-circle me-1"></i><span>Abort</span>
            </button>
        </li>
    );

    const restartAction = (props.permissions === "push" && ["passed", "errored", "stopped"].includes(props.job.state)) && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={restart}>
                <i className="bi-arrow-clockwise me-1"></i><span>Restart</span>
            </button>
        </li>
    );

    const title = (props.job.prinfo) ? props.job.prinfo.title : refRepr(props.job.ref);
    let titleUrl = "";
    if (props.job.prinfo) {
        titleUrl = props.job.prinfo.url;
    } else if (props.job.ref && props.job.ref.startsWith("refs/")) {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`;
    } else {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.job.commit.sha}`;
    }

    let buildInProgress = (
        props.job.state === "running" &&
        props.job.status.hasOwnProperty("total") &&
        props.job.status.hasOwnProperty("passed") &&
        props.job.status.hasOwnProperty("failed") &&
        (props.job.status.total >= (props.job.status.passed + props.job.status.failed))
    );

    let progressPercent = 0;
    let runningJobStatus = "";
    if (buildInProgress) {
        let jobsDone = props.job.status.passed + props.job.status.failed;
        progressPercent = Math.round((jobsDone * 100) / props.job.status.total);
        runningJobStatus = `fail: ${props.job.status.failed} pass: ${props.job.status.passed} done: ${jobsDone}/${props.job.status.total}`;
    }

    let jobItemTitleTooltip = `Commit: ${props.job.commit.sha}\n\n${props.job.commit.message}\n\nAuthor: ${props.job.commit.author}`;
    if (props.job.prinfo && props.job.prinfo.hasOwnProperty("is_merged") && props.job.prinfo.is_merged) {
        jobItemTitleTooltip += "\n\nState: merged"
    }
    else if (props.job.prinfo && props.job.prinfo.hasOwnProperty("state")) {
        jobItemTitleTooltip += `\n\nState: ${props.job.prinfo.state}`
    }

    let githubIconColor = "text-dark";
    if (props.job.prinfo && props.job.prinfo.hasOwnProperty("is_merged") && props.job.prinfo.is_merged) {
        githubIconColor = "text-info";
    }
    else if (props.job.prinfo && props.job.prinfo.hasOwnProperty("state") && props.job.prinfo.state === "closed") {
        githubIconColor = "text-danger";
    }
    else if (props.job.prinfo && props.job.prinfo.hasOwnProperty("state") && props.job.prinfo.state === "open") {
        githubIconColor = "text-success";
    }

    return (
        <tr>
            <td style={{ width: "30px" }}>
                {(props.small) ? (
                    <a className="btn link-underline-hover p-0 text-primary" href={`/details/${props.job.uid}`}>{`${props.job.uid.substring(0, 4)}`}</a>
                ) : (
                    <a className="btn link-underline-hover p-0 text-primary" href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.job.uid}`}>{`${props.job.uid.substring(0, 7)}`}</a>
                )
                }
            </td>
            <td style={{ width: "800px" }}>
                <span className="align-middle text-break" data-bs-toggle="tooltip" data-bs-placement="bottom" title={jobItemTitleTooltip}>
                    <i className={`bi-github ${githubIconColor} me-1`}></i>
                    <a className="link-underline-hover text-dark me-1" href={titleUrl} target="_blank" rel="noreferrer noopener">
                        {props.job.prinfo ? `PR #${props.job.prinfo.number}: ${title}`: `${title}`}
                    </a>
                </span>
            </td>
            <td style={{ width: "250px" }} className="px-0">
                <a className="btn text-start p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                <DateShortElem date={jobDate} />
                </a>
            </td>
            {(!props.small) && (
            <td className="text-center px-0" style={{ width: "250px" }}>
                {(props.job.state === "running") && (
                    (buildInProgress) ? (
                        <a className="btn align-middle" style={{width: "100%"}} href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={runningJobStatus}>
                            {props.job.status.failed ? <i className="animate-flicker bi-exclamation-triangle me-1 text-danger"></i> : null}{`${moment.duration(props.job.status.eta, "seconds").humanize(true)} (${progressPercent}%)`}
                            <div className="progress position-relative" style={{height: "5px"}}>
                                <div className={`progress-bar progress-bar-animated progress-bar-striped bg-${props.job.status.failed ? "danger" : "warning"}`} role="progressbar"
                                    style={{ width: `${progressPercent}%` }}
                                    aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                                </div>
                            </div>
                        </a>
                    ) : (
                        <a className="btn p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        {(props.job.status && props.job.status.status) ? (
                        <span className="fst-italic">{`${props.job.status.status}...`}</span>
                        ) :null}
                        </a>
                    )
                )}
                {["passed", "errored", "stopped"].includes(props.job.state) && (
                    <a className="btn p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                    <span>{`${moment.duration(props.job.runtime * -1000).humanize()}`}</span>
                    </a>
                )}
                {props.job.state === "queued" && (
                    <a className="btn p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                    <span>{" - "}</span>
                    </a>
                )}
            </td>
            )}
            <td className="text-end pe-3" style={{ width: "30px" }}>
                {(props.permissions === "push") ? (
                    <div className="dropdown" data-bs-toggle="tooltip" data-bs-placement="bottom" title={stateText[props.job.state]}>
                        {(props.small) ? (
                        <button className="btn dropdown-toggle p-0 d-block d-sm-none" type="button" id="dropdownMenuActions" data-bs-toggle="dropdown" aria-expanded="false">
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{cardIcon[props.job.state]}</span>
                        </button>
                        ) : (
                        <button className="btn dropdown-toggle p-0 d-none d-sm-block" type="button" id="dropdownMenuActions" data-bs-toggle="dropdown" aria-expanded="false">
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{stateText[props.job.state]}</span>
                        </button>
                        )}
                        <ul className="dropdown-menu dropdown-menu-end p-0" style={{minWidth: "20px"}} aria-labelledby="dropdownMenuActions">
                            {cancelAction}
                            {stopAction}
                            {restartAction}
                        </ul>
                    </div>
                ) : (
                    <>
                    {(props.small) ? (
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{cardIcon[props.job.state]}</span>
                    ) : (
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{stateText[props.job.state]}</span>
                    )}
                    </>
                )
                }
            </td>
        </tr>
    );
}

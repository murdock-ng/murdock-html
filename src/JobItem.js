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
import { preciseDuration } from './utils';


export const JobItem = (props) => {
    const jobDate = new Date(props.job.creation_time * 1000);

    const isMergeQueue = props.job.ref && props.job.ref.startsWith("refs/") && props.job.ref.split("/").slice(2,3).join("/") === "gh-readonly-queue";

    const refRepr = () => {
        const ref = props.job.ref;
        const commitMsgLines = props.job.commit.message.split("\n");
        if (ref && ref.startsWith("refs/")) {
            if (isMergeQueue) {
                return `${commitMsgLines[0]} - Merge Queue`
            }
            return `${ref.split("/").slice(2).join("/")} @ ${commitMsgLines[0]}`
        }
        return ref.substring(0, 15);
    };

    let jobContext = "";
    if (props.job.prinfo) {
        jobContext = `(PR #${props.job.prinfo.number})`;
    } else {
        jobContext = `(${refRepr()})`;
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

    const title = (props.job.prinfo) ? props.job.prinfo.title : refRepr();
    let titleUrl = "";
    if (props.job.prinfo) {
        titleUrl = props.job.prinfo.url;
    } else if (isMergeQueue) {
        const target_branch = props.job.ref.split("/").slice(3, 4)[0];
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/queue/${target_branch}`;
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

    if (props.job.prinfo && props.job.prinfo.hasOwnProperty("labels") && props.job.prinfo.labels.length > 0) {
        jobItemTitleTooltip += `\n\nLabels: "${props.job.prinfo.labels.join('", "')}"`
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
            <td style={{ width: "30px" }} className="px-0">
                {(props.small) ? (
                    <a className="link-underline-hover text-primary px-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                        <span className="align px-1">
                            {`${props.job.uid.substring(0, 4)}`}
                        </span>
                    </a>
                ) : (
                    <a className="link-underline-hover text-primary px-0" style={{width: "100%"}} href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${props.job.uid}`}>
                        <span className="px-1">
                            {`${props.job.uid.substring(0, 7)}`}
                        </span>
                    </a>
                )
                }
            </td>
            <td style={{ width: "800px" }} className="px-0">
                <div className="d-flex">
                <a className="text-dark text-decoration-none text-break text-start" href={titleUrl} target="_blank" rel="noreferrer noopener" data-bs-toggle="tooltip" data-bs-placement="bottom" title={titleUrl}>
                    <i className={`bi-github ${githubIconColor} me-1`}></i>
                </a>
                <a className="flex-grow-1 text-dark text-decoration-none text-break text-start p-0 px-1" href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={jobItemTitleTooltip}>
                    {props.job.prinfo ? `PR #${props.job.prinfo.number}: ${title}`: `${title}`}
                </a>
                </div>
            </td>
            <td style={{ width: "250px" }} className="px-0">
                <a className="text-dark text-decoration-none text-start p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                <DateShortElem date={jobDate} />
                </a>
            </td>
            {(!props.small) && (
            <td className="text-center px-0" style={{ width: "250px" }}>
                {(props.job.state === "running") && (
                    (buildInProgress) ? (
                        <a className="text-dark text-decoration-none align-middle" style={{width: "100%"}} href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={runningJobStatus}>
                            {props.job.status.failed ? <i className="animate-flicker bi-exclamation-triangle me-1 text-danger"></i> : null}{`${moment.duration(props.job.status.eta, "seconds").humanize(true)} (${progressPercent}%)`}
                            <div className="progress position-relative" style={{height: "5px"}}>
                                <div className={`progress-bar progress-bar-animated progress-bar-striped bg-${props.job.status.failed ? "danger" : "warning"}`} role="progressbar"
                                    style={{ width: `${progressPercent}%` }}
                                    aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                                </div>
                            </div>
                        </a>
                    ) : (
                        <a className="text-dark text-decoration-none p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        {(props.job.status && props.job.status.status) ? (
                        <span className="fst-italic">{`${props.job.status.status}...`}</span>
                        ) :null}
                        </a>
                    )
                )}
                {["passed", "errored", "stopped"].includes(props.job.state) && (
                    <a className="text-dark text-decoration-none p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                    <span>{`${preciseDuration(props.job.runtime)}`}</span>
                    </a>
                )}
                {props.job.state === "queued" && (
                    <a className="text-dark text-decoration-none p-0" style={{width: "100%"}} href={`/details/${props.job.uid}`}>
                    <span>{" - "}</span>
                    </a>
                )}
            </td>
            )}
            <td className="text-end pe-3" style={{ width: "30px" }}>
                {(props.permissions === "push") ? (
                    <div className="dropdown" data-bs-toggle="tooltip" data-bs-placement="bottom" title={stateText[props.job.state]}>
                        {(props.small) ? (
                        <a className="dropdown-toggle text-dark p-0 d-block d-sm-none" type="button" href="/" id="dropdownMenuActions" data-bs-toggle="dropdown" aria-expanded="false">
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{cardIcon[props.job.state]}</span>
                        </a>
                        ) : (
                        <a className="dropdown-toggle text-dark p-0 d-none d-sm-block" type="button" href="/" id="dropdownMenuActions" data-bs-toggle="dropdown" aria-expanded="false">
                        <span className={`badge text-${textColor[props.job.state]} bg-${cardColor[props.job.state]}`}>{stateText[props.job.state]}</span>
                        </a>
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

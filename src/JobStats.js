import { useState } from "react";

const Worker = (props) => {
    if (props.small) {
        return (
            <tr>
                <th><span className="text-break">{props.worker.name}</span></th>
                <td>{props.worker.runtime_avg.toFixed(2)}</td>
                <td>{props.worker.jobs_passed}</td>
                <td>{props.worker.jobs_failed}</td>
                <td>{props.worker.jobs_count}</td>
            </tr>
        );
    } else {
        return (
            <tr>
                <th><span className="text-break" style={{ width: "300px" }}>{props.worker.name}</span></th>
                <td>{props.worker.runtime_avg.toFixed(2)}</td>
                <td>{props.worker.runtime_min.toFixed(2)}</td>
                <td>{props.worker.runtime_max.toFixed(2)}</td>
                <td>{props.worker.total_cpu_time.toFixed(2)}</td>
                <td>{props.worker.jobs_passed}</td>
                <td>{props.worker.jobs_failed}</td>
                <td>{props.worker.jobs_count}</td>
            </tr>
        );
    }
};

export const JobStats = (props) => {
    const [filter, setFilter] = useState("");

    return (
        <>
            <div className="card m-1">
                <div className="card-header">Global stats</div>
                <div className="card-body">
                    <ul className="list-group">
                        {(props.stats.total_builds > 0) && <li className="list-group-item">Total builds: {props.stats.total_builds}</li>}
                        {(props.stats.total_tests > 0) && <li className="list-group-item">Total tests: {props.stats.total_tests}</li>}
                        {(props.stats.total_builds > 0) && (props.stats.total_tests > 0) && <li className="list-group-item">Total jobs: {props.stats.total_jobs}</li>}
                        <li className="list-group-item">Total CPU time: {props.stats.total_time}</li>
                    </ul>
                </div>
            </div>
            <div className="card m-1">
                <div className="card-header">
                <div className="row align-items-center">
                    <div className="col-md-8">Workers ({props.stats.workers.filter(worker => worker.name.includes(filter)).length})</div>
                    <div className="col-md-4">
                        <input className="form-control pull-right" type="text" placeholder="Filter workers" onChange={(event) => {setFilter(event.target.value)}} />
                    </div>
                </div>
                </div>
                <div className="card-body">
                    <div className="d-none d-sm-block p-0">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Average time (s)</th>
                                    <th scope="col">Min time (s)</th>
                                    <th scope="col">Max time (s)</th>
                                    <th scope="col">Total CPU time (s)</th>
                                    <th scope="col">Passed jobs</th>
                                    <th scope="col">Failed jobs</th>
                                    <th scope="col">Total jobs</th>
                                </tr>
                            </thead>
                            <tbody>
                            {props.stats.workers
                                .filter(worker => worker.name.includes(filter))
                                .map(worker => <Worker key={worker.name} worker={worker} small={false} />)}
                            </tbody>
                        </table>
                    </div>
                    <div className="d-block d-sm-none p-0">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Avg</th>
                                    <th scope="col">Pass</th>
                                    <th scope="col">Fail</th>
                                    <th scope="col">Tot</th>
                                </tr>
                            </thead>
                            <tbody>
                            {props.stats.workers
                                .filter(worker => worker.name.includes(filter))
                                .map(worker => <Worker key={worker.name} worker={worker} small={true}/>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

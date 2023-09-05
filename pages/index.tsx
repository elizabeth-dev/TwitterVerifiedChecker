import { mdiCheckCircle, mdiCloseCircle } from '@mdi/js';
import Icon from '@mdi/react';
import classNames from 'classnames';
import Head from 'next/head';
import { useState } from 'react';
import styles from './Home.module.scss';

interface Result {
	username: string;
	isBlue: boolean;
	blueSince?: string;
	blueHidden: boolean;
}

const dateFormatter = new Intl.DateTimeFormat();

export default function Home() {
	const [result, setResult] = useState<Result>();
	const [error, setError] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new window.FormData(e.currentTarget);
		const username = formData.get('username')?.toString()?.trim();

		if (!username) return;

		setResult(undefined);
		setError(false);

		const res = await fetch(`https://api.bluechecker.elizabeth.sh/${username}`);
		if (res.status === 200) {
			const json: Result = await res.json();
			setResult(json);
		} else {
			setError(true);
		}
	};

	return (
		<>
			<Head>
				<title>Twitter Blue checker</title>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>
			<main className={styles.main}>
				<form className={styles.form} onSubmit={handleSubmit}>
					<span className={styles.inputPrefix}>
						@<input type="text" name="username" className={styles.input} placeholder="Twitter username" prefix="@" />
					</span>
					<input type="submit" className={styles.button} value="Check" />
				</form>
				{result?.isBlue && (
					<div className={classNames(styles.result, styles.resultBlue)}>
						<Icon path={mdiCheckCircle} size={8} />
						<h2 className={styles.headline}>@{result.username} is subscribed to Twitter Blue</h2>
						{result.blueHidden && (
							<span className={styles.hidden}>Additionally, they have chosen to hide their blue checkmark.</span>
						)}
						<span className={styles.since}>
							Subscribed since {dateFormatter.format(new Date(parseInt(result.blueSince ?? '0')))}.
						</span>
					</div>
				)}
				{result?.isBlue === false && (
					<div className={classNames(styles.result, styles.resultNotBlue)}>
						<Icon path={mdiCloseCircle} size={8} />
						<h2 className={styles.headline}>@{result.username} is not subscribed to Twitter Blue</h2>
					</div>
				)}
			</main>
		</>
	);
}

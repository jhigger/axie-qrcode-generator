import {useRef, useEffect, useState} from 'react';
import QRCode from 'react-qr-code';
import {renderToString} from 'react-dom/server';
import axios from 'axios';
import {ethers} from 'ethers';

const QRCodeGenerator = ({value, height, width}) => {
	const canvas = useRef();

	useEffect(() => {
		const ctx = canvas.current.getContext('2d');
		const DOMURL = window.URL || window.webkitURL || window;

		const data = renderToString(<QRCode value={value} />);

		const img = new Image();
		const svg = new Blob([data], {
			type: 'image/svg+xml;charset=utf-8'
		});
		const url = DOMURL.createObjectURL(svg);

		img.onload = function () {
			ctx.drawImage(img, 0, 0, width, height);
			DOMURL.revokeObjectURL(url);
		};

		img.src = url;
	}, [value]);

	return (
		<canvas
			ref={canvas}
			height={height}
			width={width}
			style={{padding: 12, border: '1px solid black'}}
		></canvas>
	);
};

const createRandomMessage = async () => {
	const url = 'https://graphql-gateway.axieinfinity.com/graphql';
	const payload = {
		operationName: 'CreateRandomMessage',
		variables: {},
		query: 'mutation CreateRandomMessage{createRandomMessage}'
	};
	const randomMsg = await axios.post(url, payload).then((res) => {
		return res.data.data.createRandomMessage;
	});
	return randomMsg;
};

const getJSONWebToken = async () => {
	const msg = await createRandomMessage();
	await window.ethereum.request({method: 'eth_accounts'});
	const provider = new ethers.providers.Web3Provider(window.ethereum);
	const signer = provider.getSigner();
	const address = await signer.getAddress();
	const signature = await signer.signMessage(msg);
	const payload = {
		operationName: 'CreateAccessTokenWithSignature',
		variables: {
			input: {
				mainnet: 'ronin',
				owner: address,
				message: msg,
				signature: signature
			}
		},
		query: `mutation CreateAccessTokenWithSignature($input: SignatureInput!)
            {createAccessTokenWithSignature(input: $input)
            {newAccount result accessToken __typename}}`
	};
	const url = 'https://graphql-gateway.axieinfinity.com/graphql';
	const jwt = await axios.post(url, payload).then((res) => {
		return res.data.data.createAccessTokenWithSignature.accessToken;
	});
	return jwt;
};

function App() {
	const [value, setValue] = useState('initial value');

	const handleOnClick = async (e) => {
		e.preventDefault();
		if (!window.ethereum)
			return alert(
				'No crypto wallet found. Please install Metamask and refresh the page.'
			);

		const token = await getJSONWebToken();
		console.log('Token: ', token);
		setValue(token);
	};

	return (
		<div>
			<QRCodeGenerator value={value} width="256" height="256" />
			<button onClick={(e) => handleOnClick(e)}>Generate QRCode</button>
		</div>
	);
}

export default App;

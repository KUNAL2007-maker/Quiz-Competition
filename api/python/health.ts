export default function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'online',
    engine: 'serverless-edge',
    timestamp: new Date().toISOString(),
  });
}
